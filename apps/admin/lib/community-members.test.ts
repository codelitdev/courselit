import { describe, expect, it } from "bun:test";
import { paymentMethodLabel, shortSubscriptionId } from "./community-members";

describe("community member subscription labels", () => {
  it("names the payment provider", () => {
    expect(paymentMethodLabel("stripe")).toBe("Stripe");
    expect(paymentMethodLabel("lemonsqueezy")).toBe("Lemon Squeezy");
    expect(paymentMethodLabel("paypal")).toBe("paypal");
    expect(paymentMethodLabel(null)).toBeNull();
  });

  it("shortens long subscription ids", () => {
    expect(shortSubscriptionId("sub_1Q2w3E4r5T6y7U")).toBe("sub_1Q2w3E4r…");
    expect(shortSubscriptionId("sub_short")).toBe("sub_short");
  });
});
