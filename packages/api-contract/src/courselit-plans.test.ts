import { describe, expect, it } from "bun:test";
import { COURSELIT_PLAN_HIGHLIGHTS, COURSELIT_PLAN_LIMITS } from "./courselit-plans.js";

describe("CourseLit plans", () => {
  it("shows the limits the API enforces", () => {
    expect(COURSELIT_PLAN_LIMITS.pro).toEqual({
      marketing_emails_month: 10_000,
      storage_bytes: 20 * 1024 ** 3,
    });
    expect(COURSELIT_PLAN_HIGHLIGHTS.pro).toContain("10,000 marketing emails a month");
    expect(COURSELIT_PLAN_HIGHLIGHTS.pro).toContain("20 GB of storage");
    expect(COURSELIT_PLAN_HIGHLIGHTS.business).toContain("50,000 marketing emails a month");
    expect(COURSELIT_PLAN_HIGHLIGHTS.business).toContain("200 GB of storage");
  });

  it("names what only Business has", () => {
    for (const feature of ["SCORM lessons", "Single sign-on (SSO) for learners", "Audit log"]) {
      expect(COURSELIT_PLAN_HIGHLIGHTS.business).toContain(feature);
      expect(COURSELIT_PLAN_HIGHLIGHTS.pro).not.toContain(feature);
    }
  });
});
