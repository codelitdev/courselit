import { describe, expect, it } from "bun:test";
import { readLemonSqueezyConfig } from "./billing.js";

function lsEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    BILLING_PROVIDER: "lemonsqueezy",
    BILLING_CATALOG_REVISION: "3",
    BILLING_CURRENCY: "usd",
    BILLING_PRO_MONTH_AMOUNT_MINOR: "1900",
    BILLING_PRO_YEAR_AMOUNT_MINOR: "19000",
    BILLING_BUSINESS_MONTH_AMOUNT_MINOR: "7900",
    BILLING_BUSINESS_YEAR_AMOUNT_MINOR: "79000",
    BILLING_PRO_MONTH_PRODUCT_ID: "1001",
    BILLING_PRO_YEAR_PRODUCT_ID: "1002",
    BILLING_BUSINESS_MONTH_PRODUCT_ID: "1003",
    BILLING_BUSINESS_YEAR_PRODUCT_ID: "1004",
    BILLING_DATA_ENCRYPTION_KEY: "a2V5LWtleS1rZXkta2V5LWtleS1rZXkta2V5LWtleXk=",
    LEMONSQUEEZY_API_KEY: "ls-key",
    LEMONSQUEEZY_STORE_ID: "4242",
    LEMONSQUEEZY_WEBHOOK_SECRET: "whsec-current",
    ...overrides,
  } as NodeJS.ProcessEnv;
}

describe("readLemonSqueezyConfig", () => {
  it("uses the fake provider when no provider is set", () => {
    expect(readLemonSqueezyConfig(lsEnv({ BILLING_PROVIDER: undefined }))).toBeNull();
  });

  it("never uses a real provider under test", () => {
    expect(readLemonSqueezyConfig(lsEnv({ NODE_ENV: "test" }))).toBeNull();
  });

  it("rejects an unknown provider, including the removed dodo", () => {
    expect(() => readLemonSqueezyConfig(lsEnv({ BILLING_PROVIDER: "dodo" }))).toThrow(
      "BILLING_PROVIDER_invalid",
    );
  });

  it("reads every offer, with no provider trial", () => {
    const config = readLemonSqueezyConfig(lsEnv());
    expect(config).not.toBeNull();
    expect(config!.revision).toBe(3);
    expect(config!.storeId).toBe("4242");
    expect(config!.webhookSecrets).toEqual([{ version: "current", secret: "whsec-current" }]);
    expect(config!.offers).toEqual([
      { key: "pro_month", currency: "USD", amountMinor: 1900, providerProductId: "1001", providerTrialDays: 0 },
      { key: "pro_year", currency: "USD", amountMinor: 19000, providerProductId: "1002", providerTrialDays: 0 },
      { key: "business_month", currency: "USD", amountMinor: 7900, providerProductId: "1003", providerTrialDays: 0 },
      { key: "business_year", currency: "USD", amountMinor: 79000, providerProductId: "1004", providerTrialDays: 0 },
    ]);
  });

  it("keeps the previous webhook secret during rotation", () => {
    const config = readLemonSqueezyConfig(lsEnv({ LEMONSQUEEZY_WEBHOOK_SECRET_PREVIOUS: "whsec-old" }));
    expect(config!.webhookSecrets).toEqual([
      { version: "current", secret: "whsec-current" },
      { version: "previous", secret: "whsec-old" },
    ]);
  });

  it.each([
    "LEMONSQUEEZY_API_KEY",
    "LEMONSQUEEZY_STORE_ID",
    "LEMONSQUEEZY_WEBHOOK_SECRET",
    "BILLING_DATA_ENCRYPTION_KEY",
    "BILLING_CATALOG_REVISION",
    "BILLING_CURRENCY",
    "BILLING_BUSINESS_YEAR_AMOUNT_MINOR",
    "BILLING_PRO_MONTH_PRODUCT_ID",
  ])("fails at startup without %s", (name) => {
    expect(() => readLemonSqueezyConfig(lsEnv({ [name]: undefined }))).toThrow(`${name}_required`);
  });

  it.each(["0", "-1", "19.5", "1e3", "abc"])("rejects the amount %s", (amount) => {
    expect(() => readLemonSqueezyConfig(lsEnv({ BILLING_PRO_MONTH_AMOUNT_MINOR: amount }))).toThrow(
      "BILLING_PRO_MONTH_AMOUNT_MINOR_invalid",
    );
  });

  it("rejects a variant id that isn't numeric", () => {
    expect(() => readLemonSqueezyConfig(lsEnv({ BILLING_PRO_YEAR_PRODUCT_ID: "pdt_123" }))).toThrow(
      "BILLING_PRO_YEAR_PRODUCT_ID_invalid",
    );
  });

  it("rejects two offers sharing a variant", () => {
    expect(() => readLemonSqueezyConfig(lsEnv({ BILLING_BUSINESS_YEAR_PRODUCT_ID: "1001" }))).toThrow(
      "BILLING_PRODUCT_IDS_must_be_unique",
    );
  });

  it("rejects a currency that isn't a three-letter code", () => {
    expect(() => readLemonSqueezyConfig(lsEnv({ BILLING_CURRENCY: "dollars" }))).toThrow(
      "BILLING_CURRENCY_invalid",
    );
  });
});
