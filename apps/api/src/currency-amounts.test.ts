import { describe, expect, it } from "bun:test";
import { fromStripeAmount, toStripeAmount } from "./payments.js";
import { amountMinorForPlan, validatePlan } from "./storefront.js";

const row = (amounts: { oneTimeAmount: number | null; amountMinor: number }) => ({
  kind: "one_time" as const,
  emiAmount: null,
  emiTotalInstallments: null,
  subscriptionMonthlyAmount: null,
  subscriptionYearlyAmount: null,
  billingInterval: null,
  installmentCount: null,
  ...amounts,
});

describe("plan amounts per currency", () => {
  it("stores each currency's own minor unit", () => {
    const usd = validatePlan(
      { name: "P", type: "onetime", oneTimeAmount: 10.5 },
      { currency: "USD" },
    );
    const jpy = validatePlan(
      { name: "P", type: "onetime", oneTimeAmount: 1000 },
      { currency: "JPY" },
    );
    const kwd = validatePlan(
      { name: "P", type: "onetime", oneTimeAmount: 10.25 },
      { currency: "KWD" },
    );
    expect(usd.ok && usd.value.amountMinor).toBe(1050);
    expect(jpy.ok && jpy.value.amountMinor).toBe(1000);
    expect(kwd.ok && kwd.value.amountMinor).toBe(10250);
  });

  it("refuses more decimals than the currency can be charged in", () => {
    expect(
      validatePlan(
        { name: "P", type: "onetime", oneTimeAmount: 10.5 },
        { currency: "JPY" },
      ).ok,
    ).toBe(false);
    expect(
      validatePlan(
        { name: "P", type: "onetime", oneTimeAmount: 10.555 },
        { currency: "USD" },
      ).ok,
    ).toBe(false);
    // A third decimal can't be charged, even in a three-decimal currency.
    expect(
      validatePlan(
        { name: "P", type: "onetime", oneTimeAmount: 10.255 },
        { currency: "KWD" },
      ).ok,
    ).toBe(false);
  });

  it("charges the plan's price in the school's currency", () => {
    expect(
      amountMinorForPlan(row({ oneTimeAmount: 1000, amountMinor: 0 }), "JPY"),
    ).toBe(1000);
    expect(
      amountMinorForPlan(row({ oneTimeAmount: 1000, amountMinor: 0 }), "USD"),
    ).toBe(100000);
    expect(
      amountMinorForPlan(row({ oneTimeAmount: null, amountMinor: 1999 }), "USD"),
    ).toBe(1999);
  });
});

describe("Stripe amounts", () => {
  it("sends and reads ISK and UGX in hundredths, as Stripe requires", () => {
    expect(toStripeAmount(500, "ISK")).toBe(50000);
    expect(fromStripeAmount(50000, "isk")).toBe(500);
    expect(toStripeAmount(500, "UGX")).toBe(50000);
  });

  it("passes every other currency's minor unit through unchanged", () => {
    expect(toStripeAmount(1000, "JPY")).toBe(1000);
    expect(toStripeAmount(1050, "USD")).toBe(1050);
    expect(toStripeAmount(10250, "KWD")).toBe(10250);
    expect(fromStripeAmount(1000, "JPY")).toBe(1000);
  });
});
