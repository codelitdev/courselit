import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { communityCheckoutAttempts } from "./community-commerce.js";

export const communitySubscriptions = pgTable(
  "community_subscriptions",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => communityCheckoutAttempts.id, { onDelete: "restrict" }),
    membershipId: uuid("membership_id"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    status: text("status")
      .$type<"active" | "past_due" | "cancelled" | "expired">()
      .notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    providerSubscription: uniqueIndex(
      "community_subscriptions_provider_subscription_uidx",
    ).on(table.providerSubscriptionId),
  }),
);
