import { describe, expect, it } from "bun:test";
import { schoolNameSchema } from "./school-name.js";

describe("schoolNameSchema", () => {
  it.each(["Inkwell Studio", "St. Mary's Guitar School", "Maya's Yoga — Level 2", "  Trimmed  "])(
    "accepts %p",
    (name) => {
      expect(schoolNameSchema.safeParse(name).success).toBe(true);
    },
  );

  it.each([
    "Visit https://evil.example",
    "paypal.com support",
    "www.bank-login",
    "Contact help@paypal.example",
    "PayPal Security\nReset your password",
    "x".repeat(81),
    "",
  ])("refuses %p, which would put a link or address in email subjects", (name) => {
    expect(schoolNameSchema.safeParse(name).success).toBe(false);
  });
});
