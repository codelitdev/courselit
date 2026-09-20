import type { MediaRef } from "@courselit/api-contract";
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { schoolAccounts, schools } from "./schools.js";

export const communities = pgTable(
  "communities",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** The saved public sales page in the school's website service. */
    salesPageId: text("sales_page_id").default(sql`null`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    banner: text("banner").notNull().default(""),
    featuredImage: jsonb("featured_image").$type<MediaRef | null>(),
    categories: text("categories").notNull().default('["General"]'),
    autoAcceptMembers: boolean("auto_accept_members").notNull().default(true),
    joiningReasonText: text("joining_reason_text").notNull().default(""),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolSlug: uniqueIndex("communities_school_slug_uidx").on(
      table.schoolId,
      table.slug,
    ),
    schoolSingleton: uniqueIndex("communities_school_uidx")
      .on(table.schoolId)
      .where(sql`${table.deletedAt} is null`),
  }),
);

export const communityMemberships = pgTable(
  "community_memberships",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    // Kept nullable for legacy/free memberships and populated when a learner
    // joins through a selected community payment plan.
    paymentPlanId: uuid("payment_plan_id"),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<
        "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused"
      >()
      .notNull()
      .default("pending"),
    role: text("role")
      .$type<"member" | "moderator" | "owner">()
      .notNull()
      .default("member"),
    joiningReason: text("joining_reason").notNull().default(""),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    communitySchoolAccount: uniqueIndex("community_memberships_community_account_uidx").on(
      table.communityId,
      table.schoolAccountId,
    ),
  }),
);

export const communityPosts = pgTable(
  "community_posts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id").references(() => schoolAccounts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    category: text("category").notNull().default("General"),
    spaceId: uuid("space_id"),
    pinned: boolean("pinned").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    feed: index("community_posts_feed_idx").on(
      table.communityId,
      table.createdAt,
      table.id,
    ),
    listing: index("community_posts_listing_idx").on(
      table.communityId,
      table.pinned,
      table.createdAt,
      table.id,
    ),
    accountFeed: index("community_posts_account_feed_idx").on(
      table.schoolId,
      table.updatedAt,
      table.createdAt,
      table.id,
    ),
  }),
);

export const communityComments = pgTable(
  "community_comments",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    parentCommentId: uuid("parent_comment_id"),
    schoolAccountId: uuid("school_account_id").references(() => schoolAccounts.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    post: index("community_comments_post_idx").on(
      table.postId,
      table.createdAt,
      table.id,
    ),
  }),
);

export const communityReactions = pgTable(
  "community_reactions",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    entityType: text("entity_type").$type<"post" | "comment" | "reply">().notNull(),
    entityId: uuid("entity_id").notNull(),
    emoji: text("emoji").notNull(),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
  },
  (table) => ({
    accountReaction: uniqueIndex("community_reactions_account_uidx").on(
      table.communityId,
      table.entityType,
      table.entityId,
      table.emoji,
      table.schoolAccountId,
    ),
  }),
);

export const communityPostSubscribers = pgTable(
  "community_post_subscribers",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
  },
  (table) => ({
    accountSubscriber: uniqueIndex("community_subscribers_account_uidx").on(
      table.postId,
      table.schoolAccountId,
    ),
  }),
);

export const communityReports = pgTable(
  "community_reports",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    communityId: uuid("community_id")
      .notNull()
      .references(() => communities.id, { onDelete: "cascade" }),
    contentType: text("content_type").$type<"post" | "comment" | "reply">().notNull(),
    contentId: uuid("content_id").notNull(),
    contentParentId: uuid("content_parent_id"),
    schoolAccountId: uuid("school_account_id")
      .notNull()
      .references(() => schoolAccounts.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    status: text("status")
      .$type<"pending" | "accepted" | "rejected">()
      .notNull()
      .default("pending"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    accountReport: uniqueIndex("community_reports_account_uidx").on(
      table.communityId,
      table.contentType,
      table.contentId,
      table.schoolAccountId,
    ),
  }),
);
