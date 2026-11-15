import { describe, expect, it } from "bun:test";
import { courseLitPlanHighlights } from "./courselit-plans.js";

describe("courseLitPlanHighlights", () => {
  it("describes the deployment's limits", () => {
    const lines = courseLitPlanHighlights("pro", {
      marketing_emails_month: 25_000,
      storage_bytes: null,
    });
    expect(lines).toContain("25,000 marketing emails a month");
    expect(lines).toContain("Unlimited storage");
    expect(
      courseLitPlanHighlights("business", {
        marketing_emails_month: null,
        storage_bytes: 200 * 1024 ** 3,
      }),
    ).toEqual(expect.arrayContaining(["Unlimited marketing email", "200 GB of storage"]));
  });

  it("lists only the features when the limits aren't known", () => {
    expect(courseLitPlanHighlights("pro").some((line) => line.includes("storage"))).toBe(false);
  });

  it("names what only Business has", () => {
    for (const feature of ["SCORM lessons", "Single sign-on (SSO) for learners", "Audit log"]) {
      expect(courseLitPlanHighlights("business")).toContain(feature);
      expect(courseLitPlanHighlights("pro")).not.toContain(feature);
    }
  });
});
