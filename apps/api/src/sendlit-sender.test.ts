import { describe, expect, it } from "bun:test";
import { schoolSender, senderName } from "./sendlit-sender.js";

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

describe("senderName", () => {
  it("keeps an ordinary school name as it is", () => {
    expect(senderName("Smith, J. & Co")).toBe("Smith, J. & Co");
  });

  it("drops what SendLit refuses in a From name", () => {
    expect(senderName("Yoga\t<with>\u0007 Nalini")).toBe("Yoga with Nalini");
    expect(senderName("Shop\u202E @ Pay\u200BPal")).toBe("Shop Pay Pal");
    expect(senderName("x".repeat(120))).toHaveLength(100);
  });

  it("is null when nothing is left, so the sender's own name is used", () => {
    expect(senderName(" <> ")).toBeNull();
    expect(schoolSender("<>", null)).toEqual({ fromName: "CourseLit" });
  });
});
