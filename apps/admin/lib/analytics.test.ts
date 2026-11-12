import { describe, expect, it } from "bun:test";
import { ANALYTICS_RANGES, formatMinorCurrency } from "./analytics";

describe("analytics", () => {
  it("offers main's reporting periods in order", () => {
    expect(ANALYTICS_RANGES.map((range) => range.value)).toEqual([
      "1d",
      "7d",
      "30d",
      "90d",
      "1y",
      "lifetime",
    ]);
  });

  it("formats minor units as money", () => {
    const usd = formatMinorCurrency(1250, "USD");
    expect(usd).toContain("12.50");
    expect(formatMinorCurrency(0, "INR")).toContain("0.00");
    // Yen have no decimals: 1250 is ¥1,250, not ¥12.50.
    expect(formatMinorCurrency(1250, "JPY")).toContain("1,250");
    expect(formatMinorCurrency(1250, "JPY")).not.toContain(".");
  });
});
