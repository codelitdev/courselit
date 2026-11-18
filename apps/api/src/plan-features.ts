import type { BillingEngine } from "@codelitdev/billing/workflows";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  BUSINESS_FEATURES,
  lastKnownPlan,
  planIncludesFeature,
  TRIAL,
} from "./school-plan.js";
import { endNonSsoSessionsForEnforcedDomains } from "./sign-in-policy.js";
import { activationBlocker, SSO_FEATURE } from "./sso-config.js";
import { notifySsoOwner, recordSsoEvent } from "./sso-events.js";
import type { AppDb } from "./types.js";

export type Billing = Pick<BillingEngine, "hasFeature" | "commercialState">;
type SyncBilling = Pick<BillingEngine, "hasFeature" | "commercialState">;

/** Whether a running CourseLit trial gives the school `feature`. */
async function trialIncludes(
  db: AppDb,
  schoolId: string,
  feature: string,
  now: Date,
): Promise<boolean> {
  if (!TRIAL.features.includes(feature)) return false;
  const [trial] = await db
    .select({ id: schema.schoolTrials.id })
    .from(schema.schoolTrials)
    .where(
      and(
        eq(schema.schoolTrials.schoolId, schoolId),
        isNull(schema.schoolTrials.endedAt),
        gt(schema.schoolTrials.endsAt, now),
      ),
    )
    .limit(1);
  return Boolean(trial);
}

async function lastKnownIncludes(
  db: AppDb,
  schoolId: string,
  feature: string,
): Promise<boolean> {
  const [school] = await db
    .select({ lastPlan: schema.schools.lastPlan })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  return planIncludesFeature(
    lastKnownPlan({ kind: "unknown" }, school?.lastPlan),
    feature,
  );
}

/**
 * Whether the plan includes a feature, for the plan sync. `hasFeature` fails
 * closed (a read error answers false), which is wrong for taking SSO away
 * from a paying school. So before acting on a no, this reads the commercial
 * state directly, which throws when billing can't be read: the job retries
 * instead of suspending connections on a transient error. A running
 * CourseLit trial (school state, not billing) counts too (S11).
 */
export async function planIncludesFeatureOrThrow(
  billing: SyncBilling,
  schoolId: string,
  feature: string,
  db?: AppDb,
  now: Date = new Date(),
): Promise<boolean> {
  if ((await billing.hasFeature(schoolId, feature)) === true) return true;
  await billing.commercialState(schoolId);
  if ((await billing.hasFeature(schoolId, feature)) === true) return true;
  return db ? trialIncludes(db, schoolId, feature, now) : false;
}

/**
 * Whether a school's plan includes a feature: a paid plan (or `oss` mode)
 * through `@codelitdev/billing`, or a running CourseLit trial. When billing
 * can't be read, it answers from the last plan billing confirmed
 * (`schools.last_plan`) instead of no, so a billing outage never locks
 * learners out of SSO (S10, S23).
 */
export async function schoolHasFeature(
  billing: Billing,
  schoolInternalId: string,
  feature: string,
  db?: AppDb,
  now: Date = new Date(),
): Promise<boolean> {
  try {
    await billing.commercialState(schoolInternalId);
  } catch {
    return db ? lastKnownIncludes(db, schoolInternalId, feature) : false;
  }
  if ((await billing.hasFeature(schoolInternalId, feature)) === true) return true;
  return db ? trialIncludes(db, schoolInternalId, feature, now) : false;
}

/**
 * Queue a `sync_plan_features` job for a school. Called by the billing
 * lifecycle hook inside the billing transaction, so the job commits only if
 * the plan change does. It never does SSO work itself: in Postgres a failed
 * statement aborts the whole transaction, so a bug in the sync would roll the
 * billing write back. The insert is conditional on the school existing so a
 * billable entity that is not a school can't make it fail.
 */
export async function enqueuePlanFeatureSync(
  client: Pick<AppDb, "execute">,
  schoolId: string,
  clock: Clock,
): Promise<void> {
  const now = clock.now().toISOString();
  await client.execute(sql`
    INSERT INTO integration_outbox_jobs
      (id, school_id, provider, type, payload, status, attempts, revision, next_attempt_at, created_at, updated_at)
    SELECT ${uuidv7(clock)}::uuid, s.id, 'platform', 'sync_plan_features', '{}'::jsonb, 'pending', 0, 1,
           ${now}::timestamptz, ${now}::timestamptz, ${now}::timestamptz
    FROM schools s
    WHERE s.id::text = ${schoolId}
  `);
}

/**
 * Bring a school's SSO connections in line with its plan. Safe to run any
 * number of times: it reads the current plan itself.
 *
 * - Without `learner_sso`: active connections become `suspended`, their
 *   sessions end and the owner is emailed. Enforcement stops applying on its
 *   own because only an `active` connection is ever consulted.
 * - With it: suspended connections become `active` again when the activation
 *   rules still hold (a domain may have lapsed, or the settings changed),
 *   otherwise `draft`, and the owner is emailed. Turning enforcement back on
 *   ends the non-SSO sessions of the enforced domains, like the first time.
 *
 * A billing read that fails throws, so the job is retried instead of
 * suspending everyone on a transient error.
 */
export async function syncPlanFeatures(
  db: AppDb,
  billing: SyncBilling,
  schoolId: string,
  clock: Clock,
): Promise<{ suspended: number; restored: number; drafted: number }> {
  const result = { suspended: 0, restored: 0, drafted: 0 };
  const available = await planIncludesFeatureOrThrow(
    billing,
    schoolId,
    SSO_FEATURE,
    db,
    clock.now(),
  );
  const connections = await db
    .select()
    .from(schema.schoolSsoConnections)
    .where(
      and(
        eq(schema.schoolSsoConnections.schoolId, schoolId),
        inArray(schema.schoolSsoConnections.status, ["active", "suspended"]),
      ),
    );
  const now = clock.now();
  for (const connection of connections) {
    if (!available && connection.status === "active") {
      const changed = await db
        .update(schema.schoolSsoConnections)
        .set({ status: "suspended", updatedAt: now })
        .where(
          and(
            eq(schema.schoolSsoConnections.id, connection.id),
            eq(schema.schoolSsoConnections.status, "active"),
          ),
        )
        .returning({ id: schema.schoolSsoConnections.id });
      if (!changed[0]) continue;
      await db
        .delete(schema.schoolSessions)
        .where(eq(schema.schoolSessions.ssoConnectionId, connection.id));
      await recordSsoEvent(
        db,
        { schoolId, connectionId: connection.id, action: "connection.suspended", reason: "plan_lost_feature" },
        clock,
      );
      await notifySsoOwner(
        db,
        {
          schoolId,
          subject: "Single sign-on was suspended",
          lines: [
            `Single sign-on (${connection.displayName}) was suspended because your school's plan no longer includes it.`,
            "Learners can sign in with the other methods you have turned on. Upgrade to the Business plan to restore it; your settings are kept.",
          ],
          idempotencyKey: `sso-suspended:${connection.id}:${now.getTime()}`,
        },
        clock,
      );
      result.suspended += 1;
    } else if (available && connection.status === "suspended") {
      const blocker = await activationBlocker(db, connection);
      if (blocker) {
        await db
          .update(schema.schoolSsoConnections)
          .set({ status: "draft", updatedAt: now })
          .where(
            and(
              eq(schema.schoolSsoConnections.id, connection.id),
              eq(schema.schoolSsoConnections.status, "suspended"),
            ),
          );
        await recordSsoEvent(
          db,
          { schoolId, connectionId: connection.id, action: "connection.drafted", reason: blocker },
          clock,
        );
        await notifySsoOwner(
          db,
          {
            schoolId,
            subject: "Single sign-on needs attention",
            lines: [
              `Your plan includes single sign-on again, but ${connection.displayName} couldn't be turned back on automatically.`,
              "Open its settings, check the domains and run a test sign-in, then activate it.",
            ],
            idempotencyKey: `sso-drafted:${connection.id}:${now.getTime()}`,
          },
          clock,
        );
        result.drafted += 1;
        continue;
      }
      let restored = false;
      try {
        const changed = await db
          .update(schema.schoolSsoConnections)
          .set({ status: "active", updatedAt: now })
          .where(
            and(
              eq(schema.schoolSsoConnections.id, connection.id),
              eq(schema.schoolSsoConnections.status, "suspended"),
            ),
          )
          .returning({ id: schema.schoolSsoConnections.id });
        restored = Boolean(changed[0]);
      } catch {
        // Another connection of this school became active while this one was
        // suspended; only one can be.
        await db
          .update(schema.schoolSsoConnections)
          .set({ status: "draft", updatedAt: now })
          .where(eq(schema.schoolSsoConnections.id, connection.id));
        result.drafted += 1;
        continue;
      }
      if (!restored) continue;
      if (connection.enforcement === "required_for_domains") {
        await endNonSsoSessionsForEnforcedDomains(db, connection.id);
      }
      await recordSsoEvent(
        db,
        { schoolId, connectionId: connection.id, action: "connection.restored" },
        clock,
      );
      await notifySsoOwner(
        db,
        {
          schoolId,
          subject: "Single sign-on is back on",
          lines: [`Single sign-on (${connection.displayName}) was turned back on because your plan includes it again.`],
          idempotencyKey: `sso-restored:${connection.id}:${now.getTime()}`,
        },
        clock,
      );
      result.restored += 1;
    }
  }
  return result;
}

/** Schools that have an active or suspended connection, for the daily sweep. */
export async function schoolsWithSsoConnections(db: AppDb): Promise<string[]> {
  const rows = await db
    .selectDistinct({ schoolId: schema.schoolSsoConnections.schoolId })
    .from(schema.schoolSsoConnections)
    .where(inArray(schema.schoolSsoConnections.status, ["active", "suspended"]));
  return rows.map((row) => row.schoolId);
}

/** Every feature a school's plan includes, as `schoolHasFeature` decides each. */
export async function schoolPlanFeatureList(
  billing: Billing,
  schoolInternalId: string,
  db: AppDb,
  now: Date,
): Promise<string[]> {
  const all = [...new Set<string>(BUSINESS_FEATURES)];
  const included = await Promise.all(
    all.map((feature) => schoolHasFeature(billing, schoolInternalId, feature, db, now)),
  );
  return all.filter((_, index) => included[index]);
}
