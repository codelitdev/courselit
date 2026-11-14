import { describe, expect, it } from "bun:test";
import { planFeatureChecker } from "./plan-features";

describe("planFeatureChecker", () => {
  it("answers from the plan's features", () => {
    const has = planFeatureChecker(["scorm"]);
    expect(has("scorm")).toBe(true);
    expect(has("audit_log")).toBe(false);
  });

  it("locks nothing while the features are unknown; the API still decides", () => {
    expect(planFeatureChecker(null)("scorm")).toBe(true);
  });
});
