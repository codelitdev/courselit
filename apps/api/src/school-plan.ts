import type { BillingEngine } from "@codelitdev/billing/workflows";
import type { Clock } from "@codelitdev/platform";
import { and, eq, gt, isNull } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { SSO_FEATURE } from "./sso-config.js";
import type { AppDb } from "./types.js";

export const REMOVE_BRANDING_FEATURE = "remove_branding";
export const CODE_INJECTION_FEATURE = "code_injection";
export const SCORM_FEATURE = "scorm";
export const AUDIT_LOG_FEATURE = "audit_log";

/** Features on Pro (docs/wip/plan-limits.md, section 4). */
export const PRO_FEATURES = [REMOVE_BRANDING_FEATURE, CODE_INJECTION_FEATURE] as const;

/** Business has everything Pro has, plus these. */
export const BUSINESS_FEATURES = [
  ...PRO_FEATURES,
  SSO_FEATURE,
  SCORM_FEATURE,
  AUDIT_LOG_FEATURE,
] as const;

/** What each paid plan unlocks, for `planFeatures` at `createBilling`. */
export const PLAN_FEATURES: Record<"pro" | "business", readonly string[]> = {
  pro: PRO_FEATURES,
  business: BUSINESS_FEATURES,
};

const MB = 1024 * 1024;
const GB = 1024 * MB;

/**
 * What each paid plan allows (docs/wip/plan-limits.md, section 5). `null` is
 * unlimited. These are also the `planLimits` given to the billing package.
 */
export const PLAN_LIMITS: Record<
  "pro" | "business",
  { marketing_emails_month: number | null; storage_bytes: number | null }
> = {
  pro: { marketing_emails_month: 10_000, storage_bytes: 20 * GB },
  business: { marketing_emails_month: 50_000, storage_bytes: 200 * GB },
};

/**
 * The trial's own features and limits. It is Business minus removing
 * branding and public code injection, with no marketing email and 500 MB.
 * Never derived from Business's lists, so the trial can't pick up a Business
 * allowance by accident.
 */
export const TRIAL = {
  features: BUSINESS_FEATURES.filter(
    (feature) =>
      feature !== REMOVE_BRANDING_FEATURE && feature !== CODE_INJECTION_FEATURE,
  ) as readonly string[],
  limits: { marketing_emails_month: 0, storage_bytes: 500 * MB },
} as const;

/**
 * A school's plan, as every feature check, limit check, sync and the Plan
 * settings screen must read it. Nothing else calls billing directly.
 */
export type SchoolPlan =
  | { kind: "oss" }
  | { kind: "paid"; plan: "pro" | "business"; status: string }
  | { kind: "trial"; endsAt: Date }
  | { kind: "none"; reason: "expired" | "pending_checkout" | "imported" }
  | { kind: "unknown" };

type Billing = Pick<BillingEngine, "commercialState">;

/**
 * Reads the school's plan. The order matters:
 * 1. `oss` mode has every feature.
 * 2. Billing first, so a school that has paid is never treated as a trial
 *    (S18). A billing read error gives `unknown` (S23).
 * 3. A running trial.
 * 4. Otherwise none, with the reason taken from the school's state.
 *
 * Every successful billing read is cached on the school (`last_plan`), for
 * callers to fall back on while billing is `unknown`.
 */
export async function schoolPlan(
  deps: { db: AppDb; billing: Billing; mode: "cloud" | "oss"; clock: Clock },
  schoolId: string,
): Promise<SchoolPlan> {
  if (deps.mode === "oss") return { kind: "oss" };
  const [school] = await deps.db
    .select({
      status: schema.schools.status,
      lastPlan: schema.schools.lastPlan,
    })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  if (!school) return { kind: "none", reason: "expired" };

  let activePaidPlan: string | null;
  let subscriptionStatus: string | null;
  try {
    ({ activePaidPlan, subscriptionStatus } = await deps.billing.commercialState(schoolId));
  } catch {
    return { kind: "unknown" };
  }

  let plan: SchoolPlan;
  if (activePaidPlan === "pro" || activePaidPlan === "business") {
    plan = { kind: "paid", plan: activePaidPlan, status: subscriptionStatus ?? "active" };
  } else {
    const now = deps.clock.now();
    const [trial] = await deps.db
      .select({ endsAt: schema.schoolTrials.endsAt })
      .from(schema.schoolTrials)
      .where(
        and(
          eq(schema.schoolTrials.schoolId, schoolId),
          isNull(schema.schoolTrials.endedAt),
          gt(schema.schoolTrials.endsAt, now),
        ),
      )
      .limit(1);
    plan = trial
      ? { kind: "trial", endsAt: trial.endsAt }
      : {
          kind: "none",
          reason:
            school.status === "pending_checkout" || school.status === "imported"
              ? school.status
              : "expired",
        };
  }

  const stored = JSON.stringify(plan);
  if (JSON.stringify(school.lastPlan) !== stored) {
    await deps.db
      .update(schema.schools)
      .set({ lastPlan: JSON.parse(stored), lastPlanAt: deps.clock.now() })
      .where(eq(schema.schools.id, schoolId));
  }
  return plan;
}

/**
 * The plan to act on: the live one, or the last one billing confirmed when
 * billing can't be read. Feature checks use it; limit checks must not (they
 * refuse new usage on `unknown`).
 */
export function lastKnownPlan(plan: SchoolPlan, lastPlan: unknown): SchoolPlan {
  if (plan.kind !== "unknown") return plan;
  if (lastPlan && typeof lastPlan === "object" && "kind" in lastPlan) {
    const cached = lastPlan as SchoolPlan;
    if (cached.kind === "trial") {
      return { kind: "trial", endsAt: new Date(cached.endsAt) };
    }
    return cached;
  }
  return plan;
}

/** Whether a plan includes a feature. `unknown` and `none` include nothing. */
export function planIncludesFeature(plan: SchoolPlan, feature: string): boolean {
  switch (plan.kind) {
    case "oss":
      return true;
    case "paid":
      return PLAN_FEATURES[plan.plan].includes(feature);
    case "trial":
      return TRIAL.features.includes(feature);
    case "none":
    case "unknown":
      return false;
  }
}
