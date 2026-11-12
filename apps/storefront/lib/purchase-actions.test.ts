import { describe, expect, it } from "bun:test";
import { manageSubscriptionLink } from "./purchase-actions";

const purchase = {
  resourceType: "product" as const,
  resourceId: "prd_1",
  planKind: "subscription" as const,
  status: "paid" as const,
};

describe("manageSubscriptionLink", () => {
  it("points product subscriptions at their card on My products", () => {
    expect(manageSubscriptionLink(purchase)).toEqual({
      href: "/dashboard/products#product-prd_1",
      label: "Manage subscription",
    });
  });

  it("points community subscriptions at the feed, where the learner can leave", () => {
    expect(manageSubscriptionLink({ ...purchase, resourceType: "community" })).toEqual({
      href: "/dashboard",
      label: "Manage membership",
    });
  });

  it("offers nothing for other plans or unpaid purchases", () => {
    expect(manageSubscriptionLink({ ...purchase, planKind: "one_time" })).toBeNull();
    expect(manageSubscriptionLink({ ...purchase, planKind: "installment" })).toBeNull();
    expect(manageSubscriptionLink({ ...purchase, status: "refunded" })).toBeNull();
  });
});
