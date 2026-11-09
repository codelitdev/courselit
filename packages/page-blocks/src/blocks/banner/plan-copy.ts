import type { CourseLitPlan } from "../shared/types";
import { planAmount } from "../shared/utils";

/** A way to buy the product: one of its own plans, or a plan of the community
 * that includes it. */
export type BuyOption = { plan: CourseLitPlan; source: "product" | "community" };

export type BuyOptionCopy = {
  price: string;
  /** Shown after the price, e.g. "/ month". Empty for one-off prices. */
  unit: string;
  /** One line under the plan's name. */
  detail: string;
  /** The button's default caption. */
  cta: string;
  /** Small print under the button. */
  finePrint: string;
};

/** Every way to buy, product plans first, and the one to select at first. */
export function buyOptions(
  productPlans: CourseLitPlan[],
  communityPlans: CourseLitPlan[],
): { options: BuyOption[]; initial: BuyOption | undefined } {
  const options: BuyOption[] = [
    ...productPlans.map((plan) => ({ plan, source: "product" as const })),
    ...communityPlans.map((plan) => ({ plan, source: "community" as const })),
  ];
  const initial =
    options.find((option) => option.source === "product" && option.plan.isDefault) ??
    options[0];
  return { options, initial };
}

/** Wording for one way to buy. Button captions match main: "Buy now" and
 * "Get for free". */
export function buyOptionCopy(
  { plan, source }: BuyOption,
  { leadMagnet }: { leadMagnet: boolean },
): BuyOptionCopy {
  const price = planAmount(plan);
  if (source === "community") {
    const free = plan.type === "free";
    return {
      price: free ? "Free" : price,
      unit: unitFor(plan),
      detail: plan.description || "Comes with the community",
      cta: "Join community",
      finePrint: free ? "Free to join" : `${paymentTerms(plan, price)} · Secure checkout`,
    };
  }
  switch (plan.type) {
    case "free":
      return leadMagnet
        ? {
            price: "Free",
            unit: "",
            detail: plan.description || "We email it to you",
            cta: "Get for free",
            finePrint: "No card needed. We send it to your inbox.",
          }
        : {
            price: "Free",
            unit: "",
            detail: plan.description || "Full access, no card needed",
            cta: "Get for free",
            finePrint: "No card needed",
          };
    case "onetime":
      return {
        price,
        unit: "",
        detail: plan.description || "Pay once, yours to keep",
        cta: "Buy now",
        finePrint: `${paymentTerms(plan, price)} · Secure checkout`,
      };
    case "emi":
      return {
        price,
        unit: unitFor(plan),
        detail: plan.description || "Spread the cost over monthly payments",
        cta: "Buy now",
        finePrint: `${paymentTerms(plan, price)} · Secure checkout`,
      };
    default:
      return {
        price,
        unit: unitFor(plan),
        detail: plan.description || "Cancel any time",
        cta: "Buy now",
        finePrint: `${paymentTerms(plan, price)} · Secure checkout`,
      };
  }
}

function unitFor(plan: CourseLitPlan) {
  if (plan.type === "subscription") {
    return plan.billingInterval === "year" ? "/ year" : "/ month";
  }
  if (plan.type === "emi") return `× ${plan.installmentCount ?? 0}`;
  return "";
}

function paymentTerms(plan: CourseLitPlan, price: string) {
  if (plan.type === "subscription") {
    return `${price} a ${plan.billingInterval === "year" ? "year" : "month"} until you cancel`;
  }
  if (plan.type === "emi") {
    return `${plan.installmentCount ?? 0} monthly payments of ${price}`;
  }
  return `One payment of ${price}`;
}
