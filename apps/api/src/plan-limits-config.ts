/**
 * What each CourseLit plan allows (docs/wip/plan-limits.md, section 5), set by
 * the deployment rather than the code, like the plan prices:
 *
 *   PLAN_PRO_MARKETING_EMAILS_MONTH=25000
 *   PLAN_PRO_STORAGE=unlimited
 *   PLAN_BUSINESS_MARKETING_EMAILS_MONTH=100000
 *   PLAN_BUSINESS_STORAGE=unlimited
 *   PLAN_TRIAL_MARKETING_EMAILS_MONTH=0
 *   PLAN_TRIAL_STORAGE=500MB
 *
 * Each is a whole number or `unlimited`; storage also takes a `KB`, `MB`,
 * `GB` or `TB` suffix. All six are required on courselit.app (`cloud` mode),
 * so a missing one fails at startup instead of reading as unlimited. OSS
 * installs have no limits and need none of them.
 */
export type PlanLimitKey = "marketing_emails_month" | "storage_bytes";
export type PlanLimitValues = Record<PlanLimitKey, number | null>;
export type PlanLimitsConfig = Record<"pro" | "business" | "trial", PlanLimitValues>;

const PLANS = { pro: "PRO", business: "BUSINESS", trial: "TRIAL" } as const;
const UNITS: Record<string, number> = {
  "": 1,
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

function parseLimit(name: string, raw: string | undefined, sized: boolean): number | null {
  const value = raw?.trim();
  if (!value) throw new Error(`${name}_required`);
  if (value.toLowerCase() === "unlimited") return null;
  const match = /^(\d+)\s*([KMGT]?B)?$/i.exec(value);
  if (!match || (!sized && match[2])) throw new Error(`${name}_invalid`);
  const amount = Number(match[1]) * UNITS[(match[2] ?? "").toUpperCase()]!;
  if (!Number.isSafeInteger(amount)) throw new Error(`${name}_invalid`);
  return amount;
}

export function readPlanLimits(env: Record<string, string | undefined>): PlanLimitsConfig {
  const read = (plan: keyof typeof PLANS): PlanLimitValues => ({
    marketing_emails_month: parseLimit(
      `PLAN_${PLANS[plan]}_MARKETING_EMAILS_MONTH`,
      env[`PLAN_${PLANS[plan]}_MARKETING_EMAILS_MONTH`],
      false,
    ),
    storage_bytes: parseLimit(
      `PLAN_${PLANS[plan]}_STORAGE`,
      env[`PLAN_${PLANS[plan]}_STORAGE`],
      true,
    ),
  });
  return { pro: read("pro"), business: read("business"), trial: read("trial") };
}

let configured: PlanLimitsConfig | null = null;

/** Set once at startup, by the runtime, from `readPlanLimits`. */
export function configurePlanLimits(limits: PlanLimitsConfig): void {
  configured = limits;
}

/** The deployment's plan limits. Throws if the runtime didn't set them. */
export function planLimits(): PlanLimitsConfig {
  if (!configured) throw new Error("plan_limits_not_configured");
  return configured;
}
