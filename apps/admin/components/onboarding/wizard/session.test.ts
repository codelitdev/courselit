import { describe, expect, it } from "bun:test";
import { shouldOfferResume } from "./session";

describe("offering to resume setup", () => {
  it("offers it while setup is under way", () => {
    expect(shouldOfferResume({ status: "in_progress", resumePromptHidden: false })).toBe(true);
  });

  it("never offers it again once the owner said so for the school", () => {
    expect(shouldOfferResume({ status: "in_progress", resumePromptHidden: true })).toBe(false);
  });

  it("doesn't offer it when setup is finished or unknown", () => {
    expect(shouldOfferResume({ status: "complete", resumePromptHidden: false })).toBe(false);
    expect(shouldOfferResume(null)).toBe(false);
    expect(shouldOfferResume({})).toBe(false);
  });
});
