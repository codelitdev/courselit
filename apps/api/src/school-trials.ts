import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, count, eq, gte, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/** How long a CourseLit trial lasts (docs/wip/plan-limits.md, section 3). */
export const TRIAL_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

/** How many schools one account may create in a day (S15). */
export const SCHOOL_CREATIONS_PER_DAY = 3;

/**
 * The owner's email as a trial is keyed on: lowercased, `+tags` stripped, and
 * for Gmail the dots ignored, so one mailbox can't claim several trials.
 */
export function normalizeTrialEmail(email: string): string {
  const [rawLocal = "", rawDomain = ""] = email.trim().toLowerCase().split("@");
  const domain = rawDomain === "googlemail.com" ? "gmail.com" : rawDomain;
  let local = rawLocal.split("+", 1)[0] ?? "";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/** Whether the account, or its mailbox, has ever had a trial. */
export async function hasUsedTrial(db: AppDb, userId: string, email: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.schoolTrials.id })
    .from(schema.schoolTrials)
    .where(
      or(
        eq(schema.schoolTrials.userId, userId),
        eq(schema.schoolTrials.normalizedEmail, normalizeTrialEmail(email)),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Records a new trial for the school and queues the lifecycle job for its
 * end, when no billing event will fire. Returns false when the account or
 * mailbox already has a trial (including a race with another school).
 */
export async function startTrial(
  db: AppDb,
  input: { userId: string; email: string; schoolId: string },
  clock: Clock,
): Promise<{ started: true; endsAt: Date } | { started: false }> {
  if (await hasUsedTrial(db, input.userId, input.email)) return { started: false };
  const now = clock.now();
  const endsAt = new Date(now.getTime() + TRIAL_DAYS * DAY);
  const inserted = await db
    .insert(schema.schoolTrials)
    .values({
      id: uuidv7(clock),
      userId: input.userId,
      normalizedEmail: normalizeTrialEmail(input.email),
      schoolId: input.schoolId,
      startedAt: now,
      endsAt,
    })
    .onConflictDoNothing()
    .returning({ id: schema.schoolTrials.id });
  if (!inserted[0]) return { started: false };
  await enqueueLifecycleEvaluation(db, input.schoolId, endsAt, clock);
  return { started: true, endsAt };
}

/** Queues `evaluate_school_lifecycle` for a school, to run at `at`. */
export async function enqueueLifecycleEvaluation(
  db: AppDb,
  schoolId: string,
  at: Date,
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(clock),
    schoolId,
    provider: "platform",
    type: "evaluate_school_lifecycle",
    payload: {},
    status: "pending",
    attempts: 0,
    revision: 1,
    nextAttemptAt: at,
    createdAt: now,
    updatedAt: now,
  });
}

/** Schools this account created as owner in the last day (S15). */
export async function schoolsCreatedToday(
  db: AppDb,
  userId: string,
  clock: Clock,
): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(schema.memberships)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .innerJoin(schema.schools, eq(schema.schools.id, schema.memberships.schoolId))
    .where(
      and(
        eq(schema.memberships.isOwner, true),
        eq(schema.schoolAccounts.userId, userId),
        gte(schema.schools.createdAt, new Date(clock.now().getTime() - DAY)),
      ),
    );
  return Number(row?.count ?? 0);
}
