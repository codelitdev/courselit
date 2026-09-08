import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { communities } from "./communities.js";
import { schools } from "./schools.js";

/** Payment plans that grant access to a community and optional products. */
export const communityPaymentPlans = pgTable(
  "community_payment_plans",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    includedProducts: text("included_products").array().notNull().default([]),
    providerProductId: text("provider_product_id"),
    kind: text("kind")
      .$type<"free" | "one_time" | "subscription" | "installment">()
      .notNull(),
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
    communityName: uniqueIndex("community_payment_plans_name_uidx").on(
      table.communityId,
      table.name,
    ),
    activeDefault: uniqueIndex("community_payment_plans_active_default_uidx")
      .on(table.communityId)
      .where(sql`${table.status} = 'active' AND ${table.isDefault} = true`),
  }),
);
