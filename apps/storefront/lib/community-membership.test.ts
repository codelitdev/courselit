import { describe, expect, it } from "bun:test";
import { pendingCommunityName } from "./community-membership";

describe("pendingCommunityName", () => {
  it("names the community while the join request waits for approval", () => {
    expect(
      pendingCommunityName({
        id: "c",
        name: "Makers",
        membership: { status: "pending" },
      }),
    ).toBe("Makers");
  });

  it("is null for members, rejected requests and non-members", () => {
    expect(
      pendingCommunityName({
        id: "c",
        name: "Makers",
        membership: { status: "active" },
      }),
    ).toBeNull();
    expect(
      pendingCommunityName({
        id: "c",
        name: "Makers",
        membership: { status: "rejected" },
      }),
    ).toBeNull();
    expect(
      pendingCommunityName({ id: "c", name: "Makers", membership: null }),
    ).toBeNull();
    expect(pendingCommunityName(null)).toBeNull();
  });
});
