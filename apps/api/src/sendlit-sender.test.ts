import { describe, expect, it } from "bun:test";
import { schoolSender } from "./sendlit-sender.js";

describe("schoolSender", () => {
  it("signs with the school's name and sends replies to its owner", () => {
    expect(schoolSender("Yoga with Nalini", "owner@example.com")).toEqual({
      fromName: "Yoga with Nalini",
      replyTo: "owner@example.com",
    });
  });

  it("leaves reply-to unset when the owner's email is unknown", () => {
    expect(schoolSender("School", null)).toEqual({ fromName: "School" });
    expect(schoolSender("School", "  ")).toEqual({ fromName: "School" });
  });
});
