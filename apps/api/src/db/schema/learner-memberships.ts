import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schoolAccounts, schools } from "./schools.js";

/**
 * The learner's durable access relationship with a product or community.
 *
 * This is intentionally separate from `memberships`, which is the admin
 * user's staff relationship with a school. `entityId` and `paymentPlanId` contain
 * public IDs because a membership can point at either a product plan or a
 * community plan.
 */
export const learnerMemberships = pgTable(
  "learner_memberships",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    entityType: text("entity_type").$type<"product" | "community">().notNull(),
    entityId: text("entity_id").notNull(),
    paymentPlanId: text("payment_plan_id"),
    status: text("status")
      .$type<
        | "active"
        | "payment_failed"
        | "expired"
        | "pending"
        | "rejected"
        | "paused"
      >()
      .notNull()
      .default("pending"),
    role: text("role").$type<"comment" | "post" | "moderate" | null>(),
    subscriptionId: text("subscription_id"),
    subscriptionMethod: text("subscription_method"),
    joiningReason: text("joining_reason").notNull().default(""),
    rejectionReason: text("rejection_reason"),
    sessionId: text("session_id"),
    isIncludedInPlan: boolean("is_included_in_plan").notNull().default(false),
    parentMembershipId: uuid("parent_membership_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    directEntity: uniqueIndex("learner_memberships_direct_entity_uidx")
      .on(table.schoolId, table.schoolAccountId, table.entityType, table.entityId)
      .where(sql`${table.isIncludedInPlan} = false`),
    includedEntity: uniqueIndex("learner_memberships_included_entity_uidx")
      .on(
        table.schoolId,
        table.schoolAccountId,
        table.entityType,
        table.entityId,
        table.parentMembershipId,
      )
      .where(sql`${table.isIncludedInPlan} = true`),
    schoolAccountLookup: index("learner_memberships_school_account_lookup_idx").on(
      table.schoolId,
      table.schoolAccountId,
      table.status,
    ),
    parentLookup: index("learner_memberships_parent_lookup_idx").on(
      table.parentMembershipId,
      table.status,
    ),
    entityTypeCheck: check(
      "learner_memberships_entity_type_check",
      sql`${table.entityType} IN ('product', 'community')`,
    ),
    statusCheck: check(
      "learner_memberships_status_check",
      sql`${table.status} IN ('active', 'payment_failed', 'expired', 'pending', 'rejected', 'paused')`,
    ),
    roleCheck: check(
      "learner_memberships_role_check",
      sql`${table.role} IS NULL OR ${table.role} IN ('comment', 'post', 'moderate')`,
    ),
    includedParentCheck: check(
      "learner_memberships_included_parent_check",
      sql`${table.isIncludedInPlan} = false OR (${table.entityType} = 'product' AND ${table.parentMembershipId} IS NOT NULL AND ${table.paymentPlanId} IS NOT NULL)`,
    ),
  }),
);
