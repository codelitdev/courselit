import type { BillingEngine } from "@codelitdev/billing/workflows";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { queueSchoolEmail, renderSchoolEmail } from "./school-emails.js";
import { schoolPlan } from "./school-plan.js";
import type { AppDb } from "./types.js";

const DAY = 24 * 60 * 60 * 1000;

/** How long a school stays read-only before it may be deleted (section 3). */
export const GRACE_DAYS = 15;
/** How long a school waits for its owner's first checkout (S27). */
export const PENDING_CHECKOUT_DAYS = 7;

export type LifecycleDeps = {
  db: AppDb;
  billing: Pick<BillingEngine, "commercialState">;
  mode: "cloud" | "oss";
  clock: Clock;
};

export type LifecycleAction =
  | "skipped"
  | "unknown"
  | "activated"
  | "trial_closed"
  | "read_only"
  | "warned"
  | "expired_pending"
  | "unchanged";

function adminOrigin(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");
}

async function ownerEmail(db: AppDb, schoolId: string): Promise<string | null> {
  const [owner] = await db
    .select({ email: schema.schoolAccounts.email })
    .from(schema.memberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(and(eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.isOwner, true)))
    .limit(1);
  return owner?.email ?? null;
}

/**
 * Emails the owner once per notice and grace period. The notice is recorded
 * in `rate_limit_events`, so running the job again never sends it twice.
 */
async function noticeOwnerOnce(
  deps: LifecycleDeps,
  input: {
    schoolId: string;
    schoolName: string;
    notice: "read_only" | "deletion_7d" | "deletion_1d";
    graceEndsAt: Date;
    subject: string;
    lines: string[];
  },
): Promise<boolean> {
  const marker = `${input.schoolId}:${input.graceEndsAt.toISOString()}`;
  const [sent] = await deps.db
    .select({ id: schema.rateLimitEvents.id })
    .from(schema.rateLimitEvents)
    .where(
      and(
        eq(schema.rateLimitEvents.scope, "lifecycle_notice"),
        eq(schema.rateLimitEvents.action, input.notice),
        eq(schema.rateLimitEvents.subjectId, marker),
      ),
    )
    .limit(1);
  if (sent) return false;
  const to = await ownerEmail(deps.db, input.schoolId);
  if (!to) return false;
  await deps.db.insert(schema.rateLimitEvents).values({
    id: uuidv7(deps.clock),
    schoolId: input.schoolId,
    userId: "system",
    scope: "lifecycle_notice",
    action: input.notice,
    subjectId: marker,
    fingerprint: null,
    createdAt: deps.clock.now(),
  });
  const rendered = renderSchoolEmail({
    schoolName: input.schoolName,
    paragraphs: input.lines,
    button: { label: "Choose a plan", url: `${adminOrigin()}/settings/billing` },
    footer: { text: "You're receiving this because you own this school." },
  });
  await queueSchoolEmail(
    deps.db,
    input.schoolId,
    {
      to,
      subject: input.subject,
      ...rendered,
      idempotencyKey: `lifecycle:${input.notice}:${marker}`,
    },
    deps.clock,
    "staff",
  );
  return true;
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(date);

/**
 * Moves a school through its lifecycle from its plan (docs/wip/plan-limits.md,
 * section 3). Safe to run any number of times. Does nothing when billing
 * can't be read (S23) or while the school is suspended or under maintenance.
 */
export async function evaluateSchoolLifecycle(
  deps: LifecycleDeps,
  schoolId: string,
): Promise<LifecycleAction> {
  const [school] = await deps.db
    .select({
      name: schema.schools.name,
      status: schema.schools.status,
      graceEndsAt: schema.schools.graceEndsAt,
      createdAt: schema.schools.createdAt,
    })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (
    !school ||
    school.status === "suspended" ||
    school.status === "maintenance" ||
    school.status === "migrating" ||
    school.status === "deleted"
  ) {
    return "skipped";
  }
  const plan = await schoolPlan(deps, schoolId);
  const now = deps.clock.now();

  if (plan.kind === "unknown") return "unknown";

  if (plan.kind === "paid" || plan.kind === "oss" || plan.kind === "trial") {
    let action: LifecycleAction = "unchanged";
    if (plan.kind === "paid") {
      // A purchase ends the trial (S18).
      const closed = await deps.db
        .update(schema.schoolTrials)
        .set({ endedAt: now, endReason: "purchased" })
        .where(and(eq(schema.schoolTrials.schoolId, schoolId), isNull(schema.schoolTrials.endedAt)))
        .returning({ id: schema.schoolTrials.id });
      if (closed.length) action = "trial_closed";
    }
    if (school.status !== "active") {
      // Paying brings back a read-only, pending or imported school (S27).
      await deps.db
        .update(schema.schools)
        .set({ status: "active", graceEndsAt: null, updatedAt: now })
        .where(eq(schema.schools.id, schoolId));
      action = "activated";
    }
    return action;
  }

  // No plan: pending checkout, imported, or a confirmed lapse.
  if (plan.reason === "imported") return "unchanged";
  if (plan.reason === "pending_checkout") {
    if (now.getTime() - school.createdAt.getTime() >= PENDING_CHECKOUT_DAYS * DAY) {
      // It never paid and holds nothing: remove it.
      await deps.db
        .update(schema.schools)
        .set({ status: "deleted", updatedAt: now })
        .where(eq(schema.schools.id, schoolId));
      return "expired_pending";
    }
    return "unchanged";
  }

  if (school.status === "active") {
    const graceEndsAt = new Date(now.getTime() + GRACE_DAYS * DAY);
    await deps.db
      .update(schema.schools)
      .set({ status: "read_only", graceEndsAt, updatedAt: now })
      .where(eq(schema.schools.id, schoolId));
    await deps.db
      .update(schema.schoolTrials)
      .set({ endedAt: now, endReason: "expired" })
      .where(and(eq(schema.schoolTrials.schoolId, schoolId), isNull(schema.schoolTrials.endedAt)));
    await noticeOwnerOnce(deps, {
      schoolId,
      schoolName: school.name,
      notice: "read_only",
      graceEndsAt,
      subject: `${school.name} is now read-only`,
      lines: [
        `${school.name} no longer has a CourseLit plan, so it's read-only: learners can still reach what they have, but nobody can buy or join, and nothing can be changed.`,
        `Pick Pro or Business before ${formatDate(graceEndsAt)} to bring everything back. After that date the school and all of its data, including your learners' access, are deleted.`,
      ],
    });
    return "read_only";
  }

  if (school.status === "read_only" && school.graceEndsAt) {
    const left = school.graceEndsAt.getTime() - now.getTime();
    const notice = left <= DAY ? "deletion_1d" : left <= 7 * DAY ? "deletion_7d" : null;
    if (notice) {
      const sent = await noticeOwnerOnce(deps, {
        schoolId,
        schoolName: school.name,
        notice,
        graceEndsAt: school.graceEndsAt,
        subject:
          notice === "deletion_1d"
            ? `${school.name} will be deleted tomorrow`
            : `${school.name} will be deleted in 7 days`,
        lines: [
          `${school.name} has been read-only since its plan ended. On ${formatDate(school.graceEndsAt)} it will be deleted with all of its data, and your learners will lose access.`,
          "Pick Pro or Business to keep it.",
        ],
      });
      return sent ? "warned" : "unchanged";
    }
  }
  return "unchanged";
}

/** Every school the lifecycle sweep looks at. */
export async function schoolsForLifecycleSweep(db: AppDb): Promise<string[]> {
  const rows = await db
    .select({ id: schema.schools.id })
    .from(schema.schools)
    .where(notInArray(schema.schools.status, ["deleted", "maintenance", "migrating"]));
  return rows.map((row) => row.id);
}

