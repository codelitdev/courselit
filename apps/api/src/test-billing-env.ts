/** Complete platform billing settings for tests, for either provider. */
const DODO = {
  DODO_PAYMENTS_API_KEY: "dodo-key",
  DODO_PAYMENTS_WEBHOOK_KEY_CURRENT: "whsec_dodo",
};
export const LEMONSQUEEZY = {
  LEMONSQUEEZY_API_KEY: "ls-key",
  LEMONSQUEEZY_STORE_ID: "4242",
  LEMONSQUEEZY_WEBHOOK_SECRET: "whsec-current",
};

export function billingEnv(
  provider: "dodo" | "lemonsqueezy",
  overrides: Record<string, string | undefined> = {},
): NodeJS.ProcessEnv {
  const ids =
    provider === "dodo"
      ? ["pdt_pm", "pdt_py", "pdt_bm", "pdt_by"]
      : ["1001", "1002", "1003", "1004"];
  return {
    NODE_ENV: "production",
    BILLING_PROVIDER: provider,
    BILLING_CATALOG_REVISION: "3",
    BILLING_CURRENCY: "usd",
    BILLING_PRO_MONTH_AMOUNT_MINOR: "2900",
    BILLING_PRO_YEAR_AMOUNT_MINOR: "29000",
    BILLING_BUSINESS_MONTH_AMOUNT_MINOR: "7900",
    BILLING_BUSINESS_YEAR_AMOUNT_MINOR: "79000",
    BILLING_PRO_MONTH_PRODUCT_ID: ids[0],
    BILLING_PRO_YEAR_PRODUCT_ID: ids[1],
    BILLING_BUSINESS_MONTH_PRODUCT_ID: ids[2],
    BILLING_BUSINESS_YEAR_PRODUCT_ID: ids[3],
    // A fake 32-byte key, built here so scanners don't mistake it for a real one.
    BILLING_DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    ...(provider === "dodo" ? DODO : LEMONSQUEEZY),
    ...overrides,
  } as NodeJS.ProcessEnv;
}
