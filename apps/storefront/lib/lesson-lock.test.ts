import { describe, expect, it } from "bun:test";
import { lessonLockState } from "./lesson-lock";

const base = {
  preview: false,
  enrolled: true,
  requiresEnrollment: true,
  isQuiz: false,
  hasContent: true,
  availableAt: null,
};

describe("lessonLockState", () => {
  it("shows a lesson with content to an enrolled learner", () => {
    expect(lessonLockState(base)).toBe("unlocked");
  });

  it("asks people who aren't enrolled to enroll", () => {
    expect(lessonLockState({ ...base, enrolled: false, hasContent: false })).toBe("enrollment");
    expect(lessonLockState({ ...base, enrolled: false, requiresEnrollment: false, isQuiz: true })).toBe(
      "enrollment",
    );
  });

  it("tells an enrolled learner when a dripped lesson unlocks", () => {
    expect(
      lessonLockState({ ...base, hasContent: false, availableAt: "2026-12-01T00:00:00.000Z" }),
    ).toBe("dripped");
  });

  it("doesn't call an enrolled learner unenrolled when the lesson is just empty", () => {
    expect(lessonLockState({ ...base, hasContent: false })).toBe("empty");
    expect(
      lessonLockState({ ...base, enrolled: false, requiresEnrollment: false, hasContent: false }),
    ).toBe("empty");
  });

  it("never locks a preview", () => {
    expect(lessonLockState({ ...base, preview: true, enrolled: false, hasContent: false })).toBe(
      "unlocked",
    );
  });
});
