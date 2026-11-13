import { describe, expect, it } from "bun:test";
import { netAmount, nextRefundedAmount } from "./revenue.js";

describe("nextRefundedAmount", () => {
  const payment = { amountMinor: 1000, refundedAmountMinor: 200 };

  it("stores a higher running total", () => {
    expect(nextRefundedAmount(payment, 500)).toBe(500);
  });

  it("ignores totals that are lower, equal or unknown", () => {
    expect(nextRefundedAmount(payment, 100)).toBeNull();
    expect(nextRefundedAmount(payment, 200)).toBeNull();
    expect(nextRefundedAmount(payment, null)).toBeNull();
    expect(nextRefundedAmount(payment, -5)).toBeNull();
  });

  it("never exceeds what was paid", () => {
    expect(nextRefundedAmount(payment, 5000)).toBe(1000);
  });
});

describe("netAmount", () => {
  it("subtracts refunds and never goes below zero", () => {
    expect(netAmount({ amountMinor: 1000, refundedAmountMinor: 250 })).toBe(750);
    expect(netAmount({ amountMinor: 1000, refundedAmountMinor: 1200 })).toBe(0);
  });
});
