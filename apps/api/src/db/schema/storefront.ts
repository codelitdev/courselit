import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { learners } from "./catalog.js";
import { products } from "./products.js";
import { schools } from "./schools.js";

export const storefrontPlans = pgTable(
  "storefront_plans",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // CourseLit's production PaymentPlan.description is string-backed.
    // Keep that field as text instead of treating it as rich document JSON.
    description: text("description").notNull().default(""),
    includedProducts: text("included_products").array().notNull().default([]),
    providerProductId: text("provider_product_id"),
    kind: text("kind")
      .$type<"free" | "one_time" | "subscription" | "installment">()
      .notNull(),
    // These fields mirror CourseLit's production PaymentPlan model. The
    // amountMinor/billingInterval columns below are retained as a derived
    // checkout representation for the target payment adapter.
    oneTimeAmount: numeric("one_time_amount", { mode: "number" }),
    emiAmount: numeric("emi_amount", { mode: "number" }),
    emiTotalInstallments: integer("emi_total_installments"),
    subscriptionMonthlyAmount: numeric("subscription_monthly_amount", {
      mode: "number",
    }),
    subscriptionYearlyAmount: numeric("subscription_yearly_amount", {
      mode: "number",
    }),
    amountMinor: integer("amount_minor").notNull(),
    billingInterval: text("billing_interval").$type<"month" | "year" | null>(),
    installmentCount: integer("installment_count"),
    status: text("status").$type<"active" | "archived">().notNull().default("active"),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    activeFreeType: uniqueIndex("storefront_plans_active_free_type_uidx")
      .on(table.productId)
      .where(sql`${table.status} = 'active' AND ${table.kind} = 'free'`),
    activeOneTimeType: uniqueIndex("storefront_plans_active_one_time_type_uidx")
      .on(table.productId)
      .where(sql`${table.status} = 'active' AND ${table.kind} = 'one_time'`),
    activeInstallmentType: uniqueIndex("storefront_plans_active_installment_type_uidx")
      .on(table.productId)
      .where(sql`${table.status} = 'active' AND ${table.kind} = 'installment'`),
    activeSubscriptionMonthly: uniqueIndex(
      "storefront_plans_active_subscription_monthly_uidx",
    )
      .on(table.productId)
      .where(
        sql`${table.status} = 'active' AND ${table.kind} = 'subscription' AND ${table.subscriptionMonthlyAmount} IS NOT NULL`,
      ),
    activeSubscriptionYearly: uniqueIndex(
      "storefront_plans_active_subscription_yearly_uidx",
    )
      .on(table.productId)
      .where(
        sql`${table.status} = 'active' AND ${table.kind} = 'subscription' AND ${table.subscriptionYearlyAmount} IS NOT NULL`,
      ),
    activeDefault: uniqueIndex("storefront_plans_active_default_uidx")
      .on(table.productId)
      .where(sql`${table.status} = 'active' AND ${table.isDefault} = true`),
    amountCheck: check("storefront_plans_amount_check", sql`${table.amountMinor} >= 0`),
    kindCheck: check(
      "storefront_plans_kind_check",
      sql`${table.kind} IN ('free', 'one_time', 'subscription', 'installment')`,
    ),
    statusCheck: check(
      "storefront_plans_status_check",
      sql`${table.status} IN ('active', 'archived')`,
    ),
    shapeCheck: check(
      "storefront_plans_shape_check",
      sql`(
        (${table.kind} = 'free' AND ${table.amountMinor} = 0 AND ${table.billingInterval} IS NULL AND ${table.installmentCount} IS NULL)
        OR (${table.kind} = 'one_time' AND ${table.amountMinor} > 0 AND ${table.billingInterval} IS NULL AND ${table.installmentCount} IS NULL)
        OR (${table.kind} = 'subscription' AND ${table.amountMinor} > 0 AND ${table.billingInterval} IN ('month', 'year') AND ${table.installmentCount} IS NULL)
        OR (${table.kind} = 'installment' AND ${table.amountMinor} > 0 AND ${table.billingInterval} IN ('month', 'year') AND ${table.installmentCount} >= 2)
      )`,
    ),
  }),
);

export const storefrontCheckoutAttempts = pgTable(
  "storefront_checkout_attempts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => storefrontPlans.id, { onDelete: "restrict" }),
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
    schoolIdempotency: uniqueIndex("storefront_checkout_school_idempotency_uidx").on(
      table.schoolId,
      table.idempotencyKey,
    ),
    providerCheckout: uniqueIndex("storefront_checkout_provider_checkout_uidx")
      .on(table.providerCheckoutId)
      .where(sql`${table.providerCheckoutId} IS NOT NULL`),
  }),
);

/**
 * A short-lived, public checkout intent. It deliberately does not contain
 * payment credentials or learner identity. The learner is bound only when
 * the authenticated checkout endpoint consumes the intent.
 */
export const storefrontCheckoutSessions = pgTable(
  "storefront_checkout_sessions",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => storefrontPlans.id, { onDelete: "restrict" }),
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "set null",
    }),
    checkoutId: uuid("checkout_id").references(() => storefrontCheckoutAttempts.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<"open" | "completed" | "expired">()
      .notNull()
      .default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolExpiry: uniqueIndex("storefront_checkout_sessions_school_id_uidx").on(
      table.schoolId,
      table.id,
    ),
  }),
);

export const storefrontPayments = pgTable(
  "storefront_payments",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => storefrontCheckoutAttempts.id, { onDelete: "restrict" }),
    providerPaymentId: text("provider_payment_id").notNull(),
    kind: text("kind").$type<"one_time" | "subscription" | "installment">().notNull(),
    status: text("status")
      .$type<"succeeded" | "failed" | "refunded" | "disputed">()
      .notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    providerPayment: uniqueIndex("storefront_payments_provider_payment_uidx").on(
      table.providerPaymentId,
    ),
  }),
);

export const storefrontInvoices = pgTable(
  "storefront_invoices",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    paymentId: uuid("payment_id")
      .notNull()
      .unique()
      .references(() => storefrontPayments.id, { onDelete: "restrict" }),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => storefrontCheckoutAttempts.id, { onDelete: "restrict" }),
    providerInvoiceId: text("provider_invoice_id"),
    status: text("status").$type<"paid" | "refunded" | "void">().notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    providerInvoice: uniqueIndex("storefront_invoices_provider_invoice_uidx")
      .on(table.providerInvoiceId)
      .where(sql`${table.providerInvoiceId} IS NOT NULL`),
  }),
);

export const storefrontSubscriptions = pgTable(
  "storefront_subscriptions",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    checkoutId: uuid("checkout_id")
      .notNull()
      .references(() => storefrontCheckoutAttempts.id, { onDelete: "restrict" }),
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
      "storefront_subscriptions_provider_subscription_uidx",
    ).on(table.providerSubscriptionId),
  }),
);

export const storefrontWebhookEvents = pgTable("storefront_webhook_events", {
  id: uuid("id").primaryKey(),
  provider: text("provider").$type<"stripe" | "lemonsqueezy" | "razorpay">().notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  payload: text("payload").notNull(),
  status: text("status")
    .$type<"received" | "processed" | "ignored" | "failed">()
    .notNull()
    .default("received"),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});
