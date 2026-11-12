import { describe, expect, it } from "bun:test";
import {
  currencyExponent,
  formatMoney,
  majorToMinor,
  minorToMajor,
  priceDecimals,
} from "./money.js";

describe("money", () => {
  it("knows each currency's minor unit", () => {
    expect(currencyExponent("usd")).toBe(2);
    expect(currencyExponent("INR")).toBe(2);
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("KWD")).toBe(3);
    // ISO says two decimals even where everyday prices are whole numbers.
    expect(currencyExponent("HUF")).toBe(2);
    expect(priceDecimals("KWD")).toBe(2);
    expect(priceDecimals("JPY")).toBe(0);
  });

  it("converts major amounts to the minor unit", () => {
    expect(majorToMinor(10.5, "USD")).toBe(1050);
    expect(majorToMinor(19.99, "USD")).toBe(1999);
    expect(majorToMinor(1000, "JPY")).toBe(1000);
    // A three-decimal price ends in 0, which is all providers can charge.
    expect(majorToMinor(10.25, "KWD")).toBe(10250);
    expect(majorToMinor(10.255, "KWD")).toBe(10260);
    expect(majorToMinor(-1, "USD")).toBeNull();
    expect(majorToMinor(Number.NaN, "USD")).toBeNull();
  });

  it("converts the minor unit back to major amounts", () => {
    expect(minorToMajor(1050, "USD")).toBe(10.5);
    expect(minorToMajor(1000, "JPY")).toBe(1000);
    expect(minorToMajor(10250, "KWD")).toBe(10.25);
  });

  it("formats with the currency's decimals", () => {
    expect(formatMoney(1050, "USD", { locale: "en-US" })).toBe("$10.50");
    expect(formatMoney(1000, "JPY", { locale: "en-US" })).toBe("¥1,000");
    expect(formatMoney(10250, "KWD", { locale: "en-US" })).toMatch(/^KWD\s10\.250$/);
    expect(formatMoney(0, "INR", { locale: "en-IN" })).toBe("₹0.00");
    expect(formatMoney(500, "ZZZ1", { locale: "en-US" })).toBe("ZZZ1 5.00");
    expect(formatMoney(50000, "INR", { locale: "en-IN", compact: true })).toBe("₹500");
    expect(formatMoney(50050, "INR", { locale: "en-IN", compact: true })).toBe(
      "₹500.50",
    );
  });
});
