type PurchaseLike = {
  resourceType: "product" | "community";
  resourceId: string;
  planKind: "free" | "one_time" | "subscription" | "installment";
  status: "paid" | "refunded" | "disputed" | "failed";
};

/** Element id of a product's card on My products, so links can scroll to it. */
export function productCardAnchor(productId: string): string {
  return `product-${productId}`;
}

/**
 * Where a learner manages a subscription bought from this school: the
 * product's card on My products, or the community's menu on the feed, where
 * leaving also cancels the billing. Null for anything else.
 */
export function manageSubscriptionLink(
  purchase: PurchaseLike,
): { href: string; label: string } | null {
  if (purchase.planKind !== "subscription" || purchase.status !== "paid") return null;
  if (purchase.resourceType === "community") {
    return { href: "/dashboard", label: "Manage membership" };
  }
  return {
    href: `/dashboard/products#${productCardAnchor(purchase.resourceId)}`,
    label: "Manage subscription",
  };
}
