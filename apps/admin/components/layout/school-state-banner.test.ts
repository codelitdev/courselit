import { describe, expect, it } from "bun:test";
import { schoolStateNotice } from "./school-state-banner";

describe("schoolStateNotice", () => {
  it("says nothing about a running school", () => {
    expect(
      schoolStateNotice({ name: "A", status: "active", isOwner: true }),
    ).toBeNull();
    expect(schoolStateNotice({ name: "A", status: undefined })).toBeNull();
  });

  it("sends the owner of a read-only school to pick a plan", () => {
    const notice = schoolStateNotice({ name: "A", status: "read_only", isOwner: true });
    expect(notice?.text).toContain("read-only");
    expect(notice?.actionLabel).toBe("Choose a plan");
  });

  it("tells the rest of the team to ask the owner", () => {
    const notice = schoolStateNotice({
      name: "A",
      status: "read_only",
      isOwner: false,
    });
    expect(notice?.text).toContain("its owner");
    expect(notice?.actionLabel).not.toBe("Choose a plan");
  });

  it("opens the plan step for a school waiting on checkout", () => {
    for (const status of ["pending_checkout", "imported"]) {
      const notice = schoolStateNotice({ name: "A", status, isOwner: true });
      expect(notice?.actionHref).toBe("/onboarding/setup?plan=1");
    }
  });

  it("points a suspended school at support", () => {
    expect(
      schoolStateNotice({ name: "A", status: "suspended", isOwner: true })?.text,
    ).toContain("support@courselit.app");
  });
});
