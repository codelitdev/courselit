import { uuidv7 } from "@codelitdev/platform";
import { and, eq, isNotNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type PlanLimitDeps, schoolLimit } from "./plan-limit.js";
import { getSendLitTeamUsage, type SendLitMonthUsage } from "./sendlit-client.js";
import { adminOrigin, ownerEmail } from "./school-lifecycle.js";
import { queueSchoolEmail, renderSchoolEmail } from "./school-emails.js";
import { schoolPlan } from "./school-plan.js";
import { storageUsed } from "./storage.js";
import type { AppDb } from "./types.js";

/**
 * What a school has used against each limit (docs/wip/plan-limits.md,
 * "Showing usage"). `allowed` is null for unlimited; `used` is null when it
 * can't be read right now (for email, SendLit is unreachable or the school
 * has no mailing team yet).
 */
export type LimitUsage = {
  key: "storage_bytes" | "marketing_emails_month";
  used: number | null;
  allowed: number | null;
  resetsAt: string | null;
};

export type UsageDeps = PlanLimitDeps & {
  teamUsage?: (teamId: string) => Promise<SendLitMonthUsage>;
};

async function sendLitTeamId(db: AppDb, schoolId: string): Promise<string | null> {
  const [row] = await db
    .select({ teamId: schema.schoolIntegrations.remoteTeamId })
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
        eq(schema.schoolIntegrations.status, "ready"),
        isNotNull(schema.schoolIntegrations.remoteTeamId),
      ),
    )
    .limit(1);
  return row?.teamId ?? null;
}

async function allowed(deps: UsageDeps, schoolId: string, key: LimitUsage["key"]) {
  try {
    return (await schoolLimit(deps, schoolId, key)) ?? null;
  } catch {
    return null;
  }
}

export async function schoolUsage(deps: UsageDeps, schoolId: string): Promise<LimitUsage[]> {
  const now = deps.clock.now();
  const storage = await storageUsed(deps.db, schoolId, now);
  let email: { used: number | null; resetsAt: string | null } = { used: null, resetsAt: null };
  const teamId = await sendLitTeamId(deps.db, schoolId);
  if (teamId) {
    try {
      const month = await (deps.teamUsage ?? ((id) => getSendLitTeamUsage(id)))(teamId);
      email = { used: month.accepted + month.reserved, resetsAt: month.resetsAt };
    } catch {
      // SendLit is unreachable: show the limit without a count.
    }
  }
  return [
    {
      key: "storage_bytes",
      used: storage.total,
      allowed: await allowed(deps, schoolId, "storage_bytes"),
      resetsAt: null,
    },
    {
      key: "marketing_emails_month",
      used: email.used,
      allowed: await allowed(deps, schoolId, "marketing_emails_month"),
      resetsAt: email.resetsAt,
    },
  ];
}

/** Usage at or past this share of a limit gets a warning. */
export const WARN_AT = 0.8;
/** Storage warnings re-arm once usage drops below this share. */
export const REARM_BELOW = 0.7;

/** The share of a limit used, or null when either side is unknown or unlimited. */
export function usageShare(usage: LimitUsage): number | null {
  if (usage.used === null || usage.allowed === null || usage.allowed <= 0) return null;
  return usage.used / usage.allowed;
}

const NOTICE_SCOPE = "usage_notice";

type WarnDeps = UsageDeps;

async function noticeSent(db: AppDb, schoolId: string, action: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.rateLimitEvents.id })
    .from(schema.rateLimitEvents)
    .where(
      and(
        eq(schema.rateLimitEvents.schoolId, schoolId),
        eq(schema.rateLimitEvents.scope, NOTICE_SCOPE),
        eq(schema.rateLimitEvents.action, action),
      ),
    )
    .limit(1);
  return row !== undefined;
}

async function sendNotice(
  deps: WarnDeps,
  school: { id: string; name: string },
  action: string,
  subject: string,
  lines: string[],
): Promise<boolean> {
  const to = await ownerEmail(deps.db, school.id);
  if (!to) return false;
  await deps.db.insert(schema.rateLimitEvents).values({
    id: uuidv7(deps.clock),
    schoolId: school.id,
    userId: "system",
    scope: NOTICE_SCOPE,
    action,
    subjectId: school.id,
    fingerprint: null,
    createdAt: deps.clock.now(),
  });
  const rendered = renderSchoolEmail({
    schoolName: school.name,
    paragraphs: lines,
    button: { label: "See your plan", url: `${adminOrigin()}/account/billing` },
    footer: { text: "You're receiving this because you own this school." },
  });
  await queueSchoolEmail(
    deps.db,
    school.id,
    { to, subject, ...rendered, idempotencyKey: `usage:${action}:${school.id}:${deps.clock.now().toISOString().slice(0, 10)}` },
    deps.clock,
    "staff",
  );
  return true;
}

/**
 * Emails the owner when the school reaches 80% of a limit
 * (docs/wip/plan-limits.md, "Going over a limit"):
 * - storage once each time usage crosses 80%, again only after it drops
 *   below 70%;
 * - marketing email at most once a calendar month (UTC), and never during a
 *   trial, which has no email quota.
 */
export async function warnUsage(
  deps: WarnDeps,
  school: { id: string; name: string },
): Promise<string[]> {
  const plan = await schoolPlan(deps, school.id);
  if (plan.kind !== "paid" && plan.kind !== "trial") return [];
  const sent: string[] = [];
  for (const usage of await schoolUsage(deps, school.id)) {
    const share = usageShare(usage);
    if (share === null) continue;
    if (usage.key === "storage_bytes") {
      if (share < REARM_BELOW) {
        await deps.db
          .delete(schema.rateLimitEvents)
          .where(
            and(
              eq(schema.rateLimitEvents.schoolId, school.id),
              eq(schema.rateLimitEvents.scope, NOTICE_SCOPE),
              eq(schema.rateLimitEvents.action, "storage"),
            ),
          );
      } else if (share >= WARN_AT && !(await noticeSent(deps.db, school.id, "storage"))) {
        const percent = Math.min(100, Math.round(share * 100));
        if (
          await sendNotice(deps, school, "storage", `${school.name} has used ${percent}% of its storage`, [
            `${school.name} has used ${percent}% of the storage on its CourseLit plan.`,
            "When it's full, new uploads are refused. Nothing you've uploaded is deleted.",
            "Delete files you don't need, or move to a bigger plan.",
          ])
        ) {
          sent.push("storage");
        }
      }
      continue;
    }
    if (plan.kind !== "paid" || share < WARN_AT) continue;
    const month = deps.clock.now().toISOString().slice(0, 7);
    const action = `email:${month}`;
    if (await noticeSent(deps.db, school.id, action)) continue;
    const percent = Math.min(100, Math.round(share * 100));
    if (
      await sendNotice(deps, school, action, `${school.name} has sent ${percent}% of this month's marketing email`, [
        `${school.name} has sent ${percent}% of the marketing email its CourseLit plan includes this month.`,
        "When it runs out, broadcasts, sequences and drip emails wait until next month. Sign-in codes and receipts still go out.",
        "Move to a bigger plan to send more.",
      ])
    ) {
      sent.push(action);
    }
  }
  return sent;
}

/** Runs `warnUsage` for every school on a paid plan or a trial. */
export async function sweepUsageWarnings(deps: WarnDeps): Promise<void> {
  if (deps.mode === "oss") return;
  const schools = await deps.db
    .select({ id: schema.schools.id, name: schema.schools.name })
    .from(schema.schools)
    .where(eq(schema.schools.status, "active"));
  for (const school of schools) {
    try {
      await warnUsage(deps, school);
    } catch {
      // One school's failure never stops the others; the next sweep retries.
    }
  }
}
