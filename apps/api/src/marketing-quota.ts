import type { BillingEngine } from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import { and, eq, isNotNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { PLAN_LIMITS, type SchoolPlan, schoolPlan, TRIAL } from "./school-plan.js";
import {
  type SendLitConfig,
  sendLitConfig,
  updateSendLitTeamQuota,
} from "./sendlit-client.js";
import type { AppDb } from "./types.js";

/**
 * The monthly marketing email quota for a plan: a number, `null` for
 * unlimited, or `undefined` when the plan is unknown (billing couldn't be
 * read), in which case nothing may be changed.
 */
export function marketingQuotaFor(plan: SchoolPlan): number | null | undefined {
  switch (plan.kind) {
    case "oss":
      return null;
    case "paid":
      return PLAN_LIMITS[plan.plan].marketing_emails_month;
    case "trial":
      return TRIAL.limits.marketing_emails_month;
    case "none":
      return 0;
    case "unknown":
      return undefined;
  }
}

export type MarketingQuotaDeps = {
  db: AppDb;
  billing: Pick<BillingEngine, "commercialState">;
  mode: "cloud" | "oss";
  clock: Clock;
  updateTeamQuota?: typeof updateSendLitTeamQuota;
  config?: SendLitConfig;
};

/**
 * Sets the school's SendLit team quota from its plan (S3, S20). Safe to run
 * any number of times. Skips a school whose SendLit team isn't ready yet:
 * provisioning sets it to 0 and queues this sync. Throws when billing can't
 * be read, so the job retries instead of guessing a number.
 */
export async function syncMarketingQuota(
  deps: MarketingQuotaDeps,
  schoolId: string,
): Promise<"updated" | "skipped"> {
  const config = deps.config ?? sendLitConfig();
  if (!config.server || !config.provisioningApiKey) return "skipped";
  const [integration] = await deps.db
    .select({ remoteTeamId: schema.schoolIntegrations.remoteTeamId })
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
  if (!integration?.remoteTeamId) return "skipped";
  const quota = marketingQuotaFor(await schoolPlan(deps, schoolId));
  if (quota === undefined) throw new Error("billing_unavailable");
  await (deps.updateTeamQuota ?? updateSendLitTeamQuota)(
    integration.remoteTeamId,
    { monthlyLimit: quota },
    { config },
  );
  // The quota may have gone up (an upgrade), so drip can try again now.
  await deps.db
    .update(schema.schoolIntegrations)
    .set({ marketingPausedUntil: null })
    .where(
      and(
        eq(schema.schoolIntegrations.schoolId, schoolId),
        eq(schema.schoolIntegrations.provider, "sendlit"),
      ),
    );
  return "updated";
}

/** Schools whose SendLit team is ready, for the daily reconciliation (S3). */
export async function schoolsWithSendLitTeams(db: AppDb): Promise<string[]> {
  const rows = await db
    .select({ schoolId: schema.schoolIntegrations.schoolId })
    .from(schema.schoolIntegrations)
    .where(
      and(
        eq(schema.schoolIntegrations.provider, "sendlit"),
        eq(schema.schoolIntegrations.status, "ready"),
        isNotNull(schema.schoolIntegrations.remoteTeamId),
      ),
    );
  return rows.map((row) => row.schoolId);
}
