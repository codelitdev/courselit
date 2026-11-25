import { describe, expect, it } from "bun:test";
import { readPlanLimits } from "./plan-limits-config.js";

const env = {
  PLAN_PRO_MARKETING_EMAILS_MONTH: "25000",
  PLAN_PRO_STORAGE: "unlimited",
  PLAN_BUSINESS_MARKETING_EMAILS_MONTH: "100000",
  PLAN_BUSINESS_STORAGE: "UNLIMITED",
  PLAN_TRIAL_MARKETING_EMAILS_MONTH: "0",
  PLAN_TRIAL_STORAGE: "500MB",
};

describe("readPlanLimits", () => {
  it("reads numbers, sizes and unlimited", () => {
    expect(readPlanLimits(env)).toEqual({
      pro: { marketing_emails_month: 25_000, storage_bytes: null },
      business: { marketing_emails_month: 100_000, storage_bytes: null },
      trial: { marketing_emails_month: 0, storage_bytes: 500 * 1024 * 1024 },
    });
    expect(readPlanLimits({ ...env, PLAN_PRO_STORAGE: "20 GB" }).pro.storage_bytes).toBe(
      20 * 1024 ** 3,
    );
    expect(readPlanLimits({ ...env, PLAN_PRO_STORAGE: "1048576" }).pro.storage_bytes).toBe(
      1024 * 1024,
    );
  });

  it("fails at startup instead of reading a missing limit as unlimited", () => {
    const { PLAN_TRIAL_STORAGE: _, ...missing } = env;
    expect(() => readPlanLimits(missing)).toThrow("PLAN_TRIAL_STORAGE_required");
  });

  it("refuses values it can't read", () => {
    for (const [name, value] of [
      ["PLAN_PRO_STORAGE", "lots"],
      ["PLAN_PRO_STORAGE", "-1GB"],
      ["PLAN_PRO_MARKETING_EMAILS_MONTH", "25k"],
      ["PLAN_PRO_MARKETING_EMAILS_MONTH", "100MB"],
    ] as const) {
      expect(() => readPlanLimits({ ...env, [name]: value })).toThrow(`${name}_invalid`);
    }
  });
});
