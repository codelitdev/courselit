import { describe, expect, it } from "bun:test";
import { auditActionLabel, auditActorLabel } from "./audit-log-settings";

describe("audit log labels", () => {
  it("names who did it", () => {
    expect(
      auditActorLabel({ kind: "user", name: "Maya", email: "m@example.com" }),
    ).toBe("Maya");
    expect(auditActorLabel({ kind: "user", name: null, email: "m@example.com" })).toBe(
      "m@example.com",
    );
    expect(auditActorLabel({ kind: "user", name: null, email: null })).toBe(
      "A former team member",
    );
    expect(auditActorLabel({ kind: "system", name: null, email: null })).toBe(
      "CourseLit",
    );
  });

  it("turns action keys into words", () => {
    expect(auditActionLabel("school.updated")).toBe("School updated");
    expect(auditActionLabel("learner.owner_profile_provisioned")).toBe(
      "Learner owner profile provisioned",
    );
  });
});
