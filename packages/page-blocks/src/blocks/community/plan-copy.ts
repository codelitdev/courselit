import type { CourseLitPlan } from "../shared/types";
import { planAmount } from "../shared/utils";

/** Price, its unit, a one-line summary and the join caption for a plan. */
export function planCopy(plan: CourseLitPlan, needsApproval: boolean) {
  const price = planAmount(plan);
  switch (plan.type) {
    case "free":
      return {
        price: "Free",
        unit: "",
        detail: plan.description || "No payment needed",
        join: needsApproval ? "Request to join" : "Join for free",
        note: null,
      };
    case "onetime":
      return {
        price,
        unit: "one time",
        detail: plan.description || "Pay once, keep access",
        join: `Join for ${price}`,
        note: "One payment. No subscription.",
      };
    case "emi":
      return {
        price,
        unit: `× ${plan.installmentCount ?? 0} payments`,
        detail: plan.description || "Spread the cost over monthly payments",
        join: `Join for ${price} a month`,
        note: `${plan.installmentCount ?? 0} monthly payments, then it's yours.`,
      };
    default: {
      const yearly = plan.billingInterval === "year";
      return {
        price,
        unit: yearly ? "per year" : "per month",
        detail: plan.description || "Cancel any time",
        join: `Join for ${price} a ${yearly ? "year" : "month"}`,
        note: `Billed ${yearly ? "yearly" : "monthly"}. Cancel any time.`,
      };
    }
  }
}
