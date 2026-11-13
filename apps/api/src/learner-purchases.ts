import { serializeDate } from "@codelitdev/platform";
import type { learnerPurchaseSchema } from "@courselit/api-contract";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export type LearnerPurchaseDto = z.infer<typeof learnerPurchaseSchema>;

const MAX_PURCHASES = 200;

function purchaseStatus(
  status: "succeeded" | "failed" | "refunded" | "disputed",
): LearnerPurchaseDto["status"] {
  return status === "succeeded" ? "paid" : status;
}

/** Everything the signed-in learner paid this school, newest first. Only
 * their own payments at this school are ever read. */
export async function listLearnerPurchases(
  db: AppDb,
  input: { schoolId: string; schoolAccountId: string },
): Promise<LearnerPurchaseDto[]> {
  const products = await db
    .select({
      invoice: schema.storefrontInvoices,
      payment: schema.storefrontPayments,
      attempt: schema.storefrontCheckoutAttempts,
      product: schema.products,
      plan: schema.storefrontPlans,
    })
    .from(schema.storefrontInvoices)
    .innerJoin(
      schema.storefrontPayments,
      eq(schema.storefrontPayments.id, schema.storefrontInvoices.paymentId),
    )
    .innerJoin(
      schema.storefrontCheckoutAttempts,
      eq(schema.storefrontCheckoutAttempts.id, schema.storefrontInvoices.checkoutId),
    )
    .innerJoin(
      schema.products,
      eq(schema.products.id, schema.storefrontCheckoutAttempts.productId),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.storefrontCheckoutAttempts.planId),
    )
    .where(
      and(
        eq(schema.storefrontCheckoutAttempts.schoolId, input.schoolId),
        eq(schema.storefrontCheckoutAttempts.schoolAccountId, input.schoolAccountId),
      ),
    )
    .orderBy(desc(schema.storefrontPayments.occurredAt))
    .limit(MAX_PURCHASES);
  const communities = await db
    .select({
      invoice: schema.communityInvoices,
      payment: schema.communityPayments,
      attempt: schema.communityCheckoutAttempts,
      community: schema.communities,
      plan: schema.storefrontPlans,
    })
    .from(schema.communityInvoices)
    .innerJoin(
      schema.communityPayments,
      eq(schema.communityPayments.id, schema.communityInvoices.paymentId),
    )
    .innerJoin(
      schema.communityCheckoutAttempts,
      eq(schema.communityCheckoutAttempts.id, schema.communityInvoices.checkoutId),
    )
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityCheckoutAttempts.communityId),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
    )
    .where(
      and(
        eq(schema.communityCheckoutAttempts.schoolId, input.schoolId),
        eq(schema.communityCheckoutAttempts.schoolAccountId, input.schoolAccountId),
      ),
    )
    .orderBy(desc(schema.communityPayments.occurredAt))
    .limit(MAX_PURCHASES);

  const items: Array<LearnerPurchaseDto & { sortAt: number }> = [
    ...products.map((row) => ({
      id: row.invoice.publicId,
      orderId: row.attempt.publicId,
      paymentId: row.payment.publicId,
      resourceType: "product" as const,
      resourceId: row.product.publicId,
      title: row.product.title,
      productKind: row.product.kind,
      productSlug: row.product.slug,
      planName: row.plan.name,
      planKind: row.plan.kind,
      amountMinor: row.payment.amountMinor,
      refundedAmountMinor: row.payment.refundedAmountMinor,
      currency: row.payment.currency,
      status: purchaseStatus(row.payment.status),
      purchasedAt: serializeDate(row.payment.occurredAt),
      sortAt: row.payment.occurredAt.getTime(),
    })),
    ...communities.map((row) => ({
      id: row.invoice.publicId,
      orderId: row.attempt.publicId,
      paymentId: row.payment.publicId,
      resourceType: "community" as const,
      resourceId: row.community.publicId,
      title: row.community.name,
      productKind: null,
      productSlug: null,
      planName: row.plan.name,
      planKind: row.plan.kind,
      amountMinor: row.payment.amountMinor,
      refundedAmountMinor: row.payment.refundedAmountMinor,
      currency: row.payment.currency,
      status: purchaseStatus(row.payment.status),
      purchasedAt: serializeDate(row.payment.occurredAt),
      sortAt: row.payment.occurredAt.getTime(),
    })),
  ];
  return items
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(0, MAX_PURCHASES)
    .map(({ sortAt: _sortAt, ...item }) => item);
}
