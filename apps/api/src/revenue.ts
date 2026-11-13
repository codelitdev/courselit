import { and, eq, gt, gte, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Revenue is money actually received: succeeded payments, in the school's
 * currency, less any partial refunds. Fully refunded and disputed payments
 * drop out once the provider tells us,
 * free sign-ups are payments of 0, and payments taken before the school
 * changed its currency are left out rather than added to a different currency.
 */

export type RevenueEvent = { date: Date; value: number };

/**
 * The refunded total to store after a provider reports `reported` refunded so
 * far, or null when nothing changes. Providers report the running total, so
 * repeated or out-of-order events never lower it, and it never exceeds what
 * was paid.
 */
export function nextRefundedAmount(
  payment: { amountMinor: number; refundedAmountMinor: number },
  reported: number | null,
): number | null {
  if (reported === null || reported < 0) return null;
  const next = Math.min(reported, payment.amountMinor);
  return next > payment.refundedAmountMinor ? next : null;
}

/** What a payment brought in after partial refunds. */
export function netAmount(payment: {
  amountMinor: number;
  refundedAmountMinor: number;
}): number {
  return Math.max(payment.amountMinor - payment.refundedAmountMinor, 0);
}

/**
 * Whether the school has taken money: any paid product or community payment,
 * refunded or not. Its currency is then fixed, as on Simplero and Podia, so
 * earlier revenue never ends up in a different currency.
 */
export async function schoolHasPaidPayments(db: AppDb, schoolId: string): Promise<boolean> {
  const [product, community] = await Promise.all([
    db
      .select({ id: schema.storefrontPayments.id })
      .from(schema.storefrontPayments)
      .innerJoin(
        schema.storefrontCheckoutAttempts,
        eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId),
      )
      .where(
        and(
          eq(schema.storefrontCheckoutAttempts.schoolId, schoolId),
          gt(schema.storefrontPayments.amountMinor, 0),
        ),
      )
      .limit(1),
    db
      .select({ id: schema.communityPayments.id })
      .from(schema.communityPayments)
      .innerJoin(
        schema.communityCheckoutAttempts,
        eq(schema.communityCheckoutAttempts.id, schema.communityPayments.checkoutId),
      )
      .where(
        and(
          eq(schema.communityCheckoutAttempts.schoolId, schoolId),
          gt(schema.communityPayments.amountMinor, 0),
        ),
      )
      .limit(1),
  ]);
  return product.length > 0 || community.length > 0;
}

/** Every succeeded product and community payment since `from`, in `currency`. */
export async function schoolRevenueEvents(
  db: AppDb,
  input: { schoolId: string; currency: string; from: Date },
): Promise<RevenueEvent[]> {
  const currency = input.currency.toUpperCase();
  const [products, communities] = await Promise.all([
    db
      .select({
        amountMinor: schema.storefrontPayments.amountMinor,
        refundedAmountMinor: schema.storefrontPayments.refundedAmountMinor,
        date: schema.storefrontPayments.occurredAt,
      })
      .from(schema.storefrontPayments)
      .innerJoin(
        schema.storefrontCheckoutAttempts,
        eq(schema.storefrontCheckoutAttempts.id, schema.storefrontPayments.checkoutId),
      )
      .where(
        and(
          eq(schema.storefrontCheckoutAttempts.schoolId, input.schoolId),
          eq(schema.storefrontPayments.status, "succeeded"),
          eq(sql`upper(${schema.storefrontPayments.currency})`, currency),
          gte(schema.storefrontPayments.occurredAt, input.from),
        ),
      ),
    db
      .select({
        amountMinor: schema.communityPayments.amountMinor,
        refundedAmountMinor: schema.communityPayments.refundedAmountMinor,
        date: schema.communityPayments.occurredAt,
      })
      .from(schema.communityPayments)
      .innerJoin(
        schema.communityCheckoutAttempts,
        eq(schema.communityCheckoutAttempts.id, schema.communityPayments.checkoutId),
      )
      .where(
        and(
          eq(schema.communityCheckoutAttempts.schoolId, input.schoolId),
          eq(schema.communityPayments.status, "succeeded"),
          eq(sql`upper(${schema.communityPayments.currency})`, currency),
          gte(schema.communityPayments.occurredAt, input.from),
        ),
      ),
  ]);
  return [...products, ...communities].map((row) => ({
    date: row.date,
    value: netAmount(row),
  }));
}
