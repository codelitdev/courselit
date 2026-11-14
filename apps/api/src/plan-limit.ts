import type { BillingEngine } from "@codelitdev/billing/workflows";
import { type Clock, createPlatformError, type PlatformError } from "@codelitdev/platform";
import { schoolPlan, TRIAL } from "./school-plan.js";
import type { AppDb } from "./types.js";

/** The limits CourseLit declares in `planLimits` (school-plan.ts, PLAN_LIMITS). */
export type PlanLimitKey = keyof typeof TRIAL.limits;

export type PlanLimitDeps = {
  db: AppDb;
  billing: Pick<BillingEngine, "commercialState" | "getLimit">;
  mode: "cloud" | "oss";
  clock: Clock;
};

/**
 * The school's allowance for `key`: a number, `null` for unlimited, or
 * `undefined` when billing can't be read. Paid plans read the billing
 * package's `getLimit`, which throws on an undeclared key, so a typo never
 * reads as unlimited (S7).
 */
export async function schoolLimit(
  deps: PlanLimitDeps,
  schoolId: string,
  key: PlanLimitKey,
): Promise<number | null | undefined> {
  const plan = await schoolPlan(deps, schoolId);
  switch (plan.kind) {
    case "oss":
      return null;
    case "paid":
      try {
        return await deps.billing.getLimit(schoolId, key);
      } catch (error) {
        if (error instanceof Error && /limit_key_unknown/.test(error.message)) throw error;
        return undefined;
      }
    case "trial":
      return TRIAL.limits[key];
    case "none":
      return 0;
    case "unknown":
      return undefined;
  }
}

/**
 * Whether `increment` more of `key` fits on top of `used`. Callers count their
 * own usage; the package never does. Refuses new usage when billing can't be
 * read and never takes away what exists.
 *
 * The used and allowed numbers go into the error only when `showNumbers` is
 * true: the caller may see the school's billing (S9).
 */
export async function checkLimit(
  deps: PlanLimitDeps,
  input: {
    schoolId: string;
    key: PlanLimitKey;
    used: number;
    increment: number;
    showNumbers: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: PlatformError }> {
  const allowed = await schoolLimit(deps, input.schoolId, input.key);
  if (allowed === undefined) {
    return {
      ok: false,
      error: createPlatformError("internal_error", {
        safeDetails: { reason: "billing_unavailable" },
      }),
    };
  }
  if (allowed === null || input.used + input.increment <= allowed) return { ok: true };
  return {
    ok: false,
    error: createPlatformError("forbidden", {
      safeDetails: input.showNumbers
        ? { reason: "plan_limit_reached", limit: input.key, used: input.used, allowed }
        : { reason: "plan_limit_reached", limit: input.key },
    }),
  };
}
