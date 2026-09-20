import type { MediaRef } from "@courselit/api-contract";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { communities } from "./communities.js";
import { products } from "./products.js";
import { schoolAccounts, schools } from "./schools.js";
import { storefrontPlans } from "./storefront.js";

export const spaces = pgTable(
  "spaces",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    logo: text("logo").notNull().default("MessagesSquare"),
    featuredImage: jsonb("featured_image").$type<MediaRef | null>(),
    follow: boolean("follow").notNull().default(false),
    whoCanPost: text("who_can_post")
      .$type<"members" | "admin">()
      .notNull()
      .default("members"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolSlug: uniqueIndex("spaces_school_slug_uidx").on(table.schoolId, table.slug),
    listing: index("spaces_school_position_idx").on(
      table.schoolId,
      table.position,
      table.id,
    ),
  }),
);

export const spaceUnlocks = pgTable(
  "space_unlocks",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    entityType: text("entity_type").$type<"community" | "product">().notNull(),
    communityId: uuid("community_id").references(() => communities.id, {
      onDelete: "cascade",
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    communityOnce: uniqueIndex("space_unlocks_community_uidx")
      .on(table.spaceId)
      .where(sql`${table.entityType} = 'community'`),
    productOnce: uniqueIndex("space_unlocks_product_uidx")
      .on(table.spaceId, table.productId)
      .where(sql`${table.entityType} = 'product'`),
    entityCheck: check(
      "space_unlocks_entity_check",
      sql`(${table.entityType} = 'community' AND ${table.communityId} IS NOT NULL AND ${table.productId} IS NULL) OR (${table.entityType} = 'product' AND ${table.productId} IS NOT NULL AND ${table.communityId} IS NULL)`,
    ),
  }),
);

export const spaceUnlockPlans = pgTable(
  "space_unlock_plans",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    unlockId: uuid("unlock_id")
      .notNull()
      .references(() => spaceUnlocks.id, { onDelete: "cascade" }),
    paymentPlanId: uuid("payment_plan_id")
      .notNull()
      .references(() => storefrontPlans.id, { onDelete: "restrict" }),
  },
  (table) => ({
    unlockPlan: uniqueIndex("space_unlock_plans_unlock_plan_uidx").on(
      table.unlockId,
      table.paymentPlanId,
    ),
  }),
);

export const spaceFollowers = pgTable(
  "space_followers",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    spaceId: uuid("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    uniqueFollower: uniqueIndex("space_followers_space_account_uidx").on(
      table.spaceId,
      table.schoolAccountId,
    ),
    accountLookup: index("space_followers_account_idx").on(
      table.schoolId,
      table.schoolAccountId,
      table.spaceId,
    ),
  }),
);
