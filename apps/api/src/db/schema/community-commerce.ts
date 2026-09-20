import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { communities } from "./communities.js";
import { storefrontPlans } from "./storefront.js";
import { schoolAccounts, schools } from "./schools.js";

export const communityCheckoutAttempts = pgTable(
  "community_checkout_attempts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => storefrontPlans.id, { onDelete: "restrict" }),
    membershipId: uuid("membership_id"),
    provider: text("provider").$type<"free" | "stripe" | "lemonsqueezy" | "razorpay">().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    providerCheckoutId: text("provider_checkout_id"),
    providerCheckoutUrl: text("provider_checkout_url"),
    status: text("status")
      .$type<"pending" | "paid" | "failed" | "cancelled" | "refunded" | "disputed">()
      .notNull()
      .default("pending"),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    schoolIdempotency: uniqueIndex("community_checkout_school_idempotency_uidx").on(
      table.schoolId,
      table.idempotencyKey,
    ),
    providerCheckout: uniqueIndex("community_checkout_provider_checkout_uidx")
      .on(table.providerCheckoutId)
      .where(sql`${table.providerCheckoutId} IS NOT NULL`),
  }),
);

export const communityPayments = pgTable("community_payments", {
  id: uuid("id").primaryKey(),
  publicId: text("public_id").notNull().unique(),
  checkoutId: uuid("checkout_id")
    .notNull()
    .references(() => communityCheckoutAttempts.id, { onDelete: "restrict" }),
  membershipId: uuid("membership_id"),
  providerPaymentId: text("provider_payment_id").notNull().unique(),
  kind: text("kind").$type<"one_time" | "subscription" | "installment">().notNull(),
  status: text("status")
    .$type<"succeeded" | "failed" | "refunded" | "disputed">()
    .notNull(),
  currency: text("currency").notNull(),
  amountMinor: integer("amount_minor").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const communityInvoices = pgTable(
  "community_invoices",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    paymentId: uuid("payment_id").references(() => communityPayments.id, {
      onDelete: "restrict",
    }),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => communityCheckoutAttempts.id, { onDelete: "restrict" }),
    membershipId: uuid("membership_id"),
    providerInvoiceId: text("provider_invoice_id"),
    status: text("status").$type<"pending" | "paid" | "refunded" | "void">().notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    providerInvoice: uniqueIndex("community_invoices_provider_invoice_uidx")
      .on(table.providerInvoiceId)
      .where(sql`${table.providerInvoiceId} IS NOT NULL`),
    paymentUnique: uniqueIndex("community_invoices_payment_uidx").on(table.paymentId),
  }),
);
