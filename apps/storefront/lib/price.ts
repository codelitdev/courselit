/**
 * Prices as learners see them across the storefront. Anything that costs
 * nothing reads "Free", never "$0.00".
 */

import { formatMoney } from "@courselit/api-contract/money";

export function formatPrice(
  amountMinor: number,
  currency: string,
  { wholeAmounts = false }: { wholeAmounts?: boolean } = {},
): string {
  if (amountMinor === 0) return "Free";
  // `wholeAmounts` drops ".00" where a compact price reads better ("$20", not
  // "$20.00"), but keeps the cents of "$20.50".
  return formatMoney(amountMinor, currency, { compact: wholeAmounts });
}

export type PricedPlan = {
  amountMinor: number;
  currency: string;
  /** Checkout and catalogue plans say `type`, course plans say `kind`. */
  type?: string;
  kind?: string;
  billingInterval?: string | null;
  installmentCount?: number | null;
};

/** Whether a plan costs the learner nothing. */
export function isFreePlan(plan: PricedPlan): boolean {
  return plan.type === "free" || plan.kind === "free" || plan.amountMinor === 0;
}

/** A plan's price with its billing terms: "$20 / month", "$50 × 3" or "Free". */
export function formatPlanPrice(
  plan: PricedPlan,
  options?: { wholeAmounts?: boolean },
): string {
  if (isFreePlan(plan)) return "Free";
  const price = formatPrice(plan.amountMinor, plan.currency, options);
  const kind = plan.type ?? plan.kind;
  if (kind === "subscription" && plan.billingInterval) {
    return `${price} / ${plan.billingInterval}`;
  }
  if ((kind === "emi" || kind === "installment") && plan.installmentCount) {
    return `${price} × ${plan.installmentCount}`;
  }
  return price;
}
