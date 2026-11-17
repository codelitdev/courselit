import { describe, expect, it } from "bun:test";
import { readBillingConfig } from "./billing.js";
import { billingEnv, LEMONSQUEEZY } from "./test-billing-env.js";

describe("readBillingConfig", () => {
  it("uses the fake provider when no provider is set", () => {
    expect(
      readBillingConfig(billingEnv("dodo", { BILLING_PROVIDER: undefined })),
    ).toBeNull();
  });

  it("never uses a real provider under test", () => {
    expect(readBillingConfig(billingEnv("dodo", { NODE_ENV: "test" }))).toBeNull();
  });

  it("sells every CourseLit offer through either provider, with no provider trial", () => {
    for (const provider of ["dodo", "lemonsqueezy"] as const) {
      const config = readBillingConfig(billingEnv(provider));
      expect(config?.checkoutProvider).toBe(provider);
      expect(config?.revision).toBe(3);
      expect(
        config?.offers.map((offer) => [
          offer.key,
          offer.plan,
          offer.interval,
          offer.amountMinor,
        ]),
      ).toEqual([
        ["pro_month", "pro", "month", 2900],
        ["pro_year", "pro", "year", 29000],
        ["business_month", "business", "month", 7900],
        ["business_year", "business", "year", 79000],
      ]);
      expect(config?.offers.every((offer) => offer.provider === provider)).toBe(true);
      expect(config?.offers.every((offer) => offer.providerTrialDays === 0)).toBe(true);
    }
  });

  it("keeps the previous provider connected after a switch", () => {
    const config = readBillingConfig(billingEnv("dodo", LEMONSQUEEZY));
    expect(config?.providers).toEqual(["dodo", "lemonsqueezy"]);
  });

  it("names a missing or invalid setting", () => {
    expect(() =>
      readBillingConfig(billingEnv("dodo", { BILLING_PROVIDER: "stripe" })),
    ).toThrow("BILLING_PROVIDER_invalid");
    expect(() =>
      readBillingConfig(
        billingEnv("dodo", { BILLING_BUSINESS_YEAR_PRODUCT_ID: undefined }),
      ),
    ).toThrow("BILLING_BUSINESS_YEAR_PRODUCT_ID_required");
    expect(() =>
      readBillingConfig(
        billingEnv("lemonsqueezy", { LEMONSQUEEZY_WEBHOOK_SECRET: "" }),
      ),
    ).toThrow("LEMONSQUEEZY_WEBHOOK_SECRET_required");
  });
});
