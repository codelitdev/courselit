import { and, eq, gte, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

/**
 * Revenue is money actually received: succeeded payments, in the school's
 * currency. Refunded and disputed payments drop out once the provider tells us,
 * free sign-ups are payments of 0, and payments taken before the school
 * changed its currency are left out rather than added to a different currency.
 */

export type RevenueEvent = { date: Date; value: number };

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
    value: row.amountMinor,
  }));
}
