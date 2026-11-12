import { formatMoney } from "@courselit/api-contract/money";

/**
 * Reporting periods and money formatting shared by the school dashboard,
 * product analytics and the products list. The periods match main.
 */

export type AnalyticsRange = "1d" | "7d" | "30d" | "90d" | "1y" | "lifetime";

export const ANALYTICS_RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "1 week" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "1y", label: "1 year" },
  { value: "lifetime", label: "Lifetime" },
];

/** An amount in the currency's minor unit: 1250 USD is "$12.50", 1250 JPY is "¥1,250". */
export function formatMinorCurrency(amountMinor: number, currency: string): string {
  return formatMoney(amountMinor, currency);
}
