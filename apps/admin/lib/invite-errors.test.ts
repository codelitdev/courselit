import { describe, expect, it } from "bun:test";
import { inviteErrorMessage } from "./invite-errors";

describe("inviteErrorMessage", () => {
  it("explains the invite limits", () => {
    expect(
      inviteErrorMessage({ details: { reason: "invite_limit_reached" } }, "x"),
    ).toContain("50 invites");
    expect(
      inviteErrorMessage({ details: { reason: "too_many_pending_invites" } }, "x"),
    ).toContain("200 team invitations");
  });

  it("falls back to the API's message, then the screen's", () => {
    expect(inviteErrorMessage({ message: "Nope" }, "x")).toBe("Nope");
    expect(inviteErrorMessage(null, "Unable to invite.")).toBe("Unable to invite.");
  });
});
