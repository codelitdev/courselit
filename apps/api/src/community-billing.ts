import { createPlatformError, type PlatformError } from "@codelitdev/platform";
import { and, eq, inArray } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { getPaymentProvider, type PaymentProvider } from "./payments.js";
import type { AppDb } from "./types.js";

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export type ActiveCommunitySubscription =
  typeof schema.communitySubscriptions.$inferSelect;

/**
 * Live community billing: subscription and installment plans the payment
 * provider is still charging. Narrow it to one learner, one community, or
 * both; leaving one out returns every match in the school for the other.
 */
export async function activeCommunitySubscriptions(
  db: AppDb,
  input:
    | { schoolId: string; schoolAccountId: string; communityId?: string }
    | { schoolId: string; schoolAccountId?: string; communityId: string },
): Promise<ActiveCommunitySubscription[]> {
  const conditions = [
    eq(schema.communitySubscriptions.status, "active"),
    eq(schema.communityCheckoutAttempts.schoolId, input.schoolId),
  ];
  if (input.schoolAccountId) {
    conditions.push(
      eq(schema.communityCheckoutAttempts.schoolAccountId, input.schoolAccountId),
    );
  }
  if (input.communityId) {
    conditions.push(
      eq(schema.communityCheckoutAttempts.communityId, input.communityId),
    );
  }
  const rows = await db
    .select({ subscription: schema.communitySubscriptions })
    .from(schema.communitySubscriptions)
    .innerJoin(
      schema.communityCheckoutAttempts,
      eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId),
    )
    .where(and(...conditions));
  return rows.map((row) => row.subscription);
}

/**
 * Stops billing at the payment provider before access is removed. A failure
 * aborts the caller, so a member is never removed while still being charged.
 */
export async function cancelCommunitySubscriptionsAtProvider(
  db: AppDb,
  schoolId: string,
  subscriptions: ActiveCommunitySubscription[],
  paymentProviderOverride?: PaymentProvider,
): Promise<Result<void>> {
  if (subscriptions.length === 0) return { ok: true, value: undefined };
  const providerUnavailable: Result<void> = {
    ok: false,
    error: createPlatformError("conflict", {
      safeDetails: { reason: "provider_unavailable" },
    }),
  };
  const paymentProvider = await getPaymentProvider(
    db,
    schoolId,
    paymentProviderOverride,
  );
  if (!paymentProvider?.cancelSubscription) return providerUnavailable;
  try {
    for (const subscription of subscriptions) {
      await paymentProvider.cancelSubscription(subscription.providerSubscriptionId);
    }
  } catch {
    return providerUnavailable;
  }
  return { ok: true, value: undefined };
}

export type LearnerCommunityBilling = {
  kind: "subscription" | "installment";
  planName: string;
};

/**
 * What each community still charges a learner, keyed by the community's
 * internal id. Communities without live billing are absent.
 */
export async function learnerCommunityBillingMap(
  db: AppDb,
  input: { schoolId: string; schoolAccountId: string; communityIds: string[] },
): Promise<Map<string, LearnerCommunityBilling>> {
  const billing = new Map<string, LearnerCommunityBilling>();
  if (input.communityIds.length === 0) return billing;
  const rows = await db
    .select({
      communityId: schema.communityCheckoutAttempts.communityId,
      planKind: schema.storefrontPlans.kind,
      planName: schema.storefrontPlans.name,
    })
    .from(schema.communitySubscriptions)
    .innerJoin(
      schema.communityCheckoutAttempts,
      eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId),
    )
    .innerJoin(
      schema.storefrontPlans,
      eq(schema.storefrontPlans.id, schema.communityCheckoutAttempts.planId),
    )
    .where(
      and(
        eq(schema.communitySubscriptions.status, "active"),
        eq(schema.communityCheckoutAttempts.schoolId, input.schoolId),
        eq(schema.communityCheckoutAttempts.schoolAccountId, input.schoolAccountId),
        inArray(schema.communityCheckoutAttempts.communityId, input.communityIds),
      ),
    );
  for (const row of rows) {
    billing.set(row.communityId, {
      kind: row.planKind === "installment" ? "installment" : "subscription",
      planName: row.planName,
    });
  }
  return billing;
}

/** Records that the provider has stopped billing these subscriptions. */
export async function markCommunitySubscriptionsCancelled(
  db: AppDb,
  subscriptions: ActiveCommunitySubscription[],
  now: Date,
): Promise<void> {
  if (subscriptions.length === 0) return;
  await db
    .update(schema.communitySubscriptions)
    .set({ status: "cancelled", cancelAt: now, updatedAt: now })
    .where(
      inArray(
        schema.communitySubscriptions.id,
        subscriptions.map((subscription) => subscription.id),
      ),
    );
}
