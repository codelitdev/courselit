import { describe, expect, it } from "bun:test";
import { formatPlanPrice, formatPrice, isFreePlan } from "./price";

const usd = (amountMinor: number) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(amountMinor / 100);

describe("formatPrice", () => {
  it("says Free for a zero price", () => {
    expect(formatPrice(0, "USD")).toBe("Free");
    expect(formatPrice(0, "USD", { wholeAmounts: true })).toBe("Free");
  });

  it("formats other prices in their currency", () => {
    expect(formatPrice(2000, "USD")).toBe(usd(2000));
    expect(formatPrice(2000, "USD", { wholeAmounts: true })).not.toContain(".00");
  });
});

describe("formatPlanPrice", () => {
  it("says Free for free plans, whatever their amount field says", () => {
    expect(formatPlanPrice({ type: "free", amountMinor: 0, currency: "USD" })).toBe(
      "Free",
    );
    expect(formatPlanPrice({ type: "onetime", amountMinor: 0, currency: "USD" })).toBe(
      "Free",
    );
    expect(formatPlanPrice({ kind: "free", amountMinor: 500, currency: "USD" })).toBe(
      "Free",
    );
  });

  it("adds billing terms to paid plans", () => {
    expect(
      formatPlanPrice({
        type: "subscription",
        amountMinor: 1000,
        currency: "USD",
        billingInterval: "month",
      }),
    ).toBe(`${usd(1000)} / month`);
    expect(
      formatPlanPrice({
        type: "emi",
        amountMinor: 1000,
        currency: "USD",
        installmentCount: 3,
      }),
    ).toBe(`${usd(1000)} × 3`);
    expect(
      formatPlanPrice({
        kind: "installment",
        amountMinor: 1000,
        currency: "USD",
        installmentCount: 3,
      }),
    ).toBe(`${usd(1000)} × 3`);
  });
});

describe("isFreePlan", () => {
  it("treats free-type and zero-amount plans as free", () => {
    expect(isFreePlan({ type: "free", amountMinor: 0, currency: "USD" })).toBe(true);
    expect(isFreePlan({ type: "onetime", amountMinor: 0, currency: "USD" })).toBe(true);
    expect(isFreePlan({ type: "onetime", amountMinor: 100, currency: "USD" })).toBe(
      false,
    );
  });
});
