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
import { user } from "./auth.generated.js";
import { learners } from "./catalog.js";
import { schools } from "./schools.js";

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
    categories: text("categories").notNull().default('["General"]'),
    enabled: boolean("enabled").notNull().default(false),
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
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
    learner: uniqueIndex("community_memberships_community_learner_uidx")
      .on(table.communityId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("community_memberships_community_admin_uidx")
      .on(table.communityId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "set null",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    category: text("category").notNull().default("General"),
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
    learnerFeed: index("community_posts_learner_feed_idx").on(
      table.schoolId,
      table.updatedAt,
      table.createdAt,
      table.id,
    ),
    oneAuthor: check(
      "community_posts_one_author_check",
      sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "set null",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
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
    oneAuthor: check(
      "community_comments_one_author_check",
      sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    learner: uniqueIndex("community_reactions_learner_uidx")
      .on(
        table.communityId,
        table.entityType,
        table.entityId,
        table.emoji,
        table.learnerId,
      )
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("community_reactions_admin_uidx")
      .on(
        table.communityId,
        table.entityType,
        table.entityId,
        table.emoji,
        table.adminUserId,
      )
      .where(sql`${table.adminUserId} IS NOT NULL`),
    oneIdentity: check(
      "community_reactions_one_identity_check",
      sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
  },
  (table) => ({
    learner: uniqueIndex("community_subscribers_learner_uidx")
      .on(table.postId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("community_subscribers_admin_uidx")
      .on(table.postId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
    oneIdentity: check(
      "community_subscribers_one_identity_check",
      sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
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
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
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
    learner: uniqueIndex("community_reports_learner_uidx")
      .on(table.communityId, table.contentType, table.contentId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("community_reports_admin_uidx")
      .on(table.communityId, table.contentType, table.contentId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
    oneIdentity: check(
      "community_reports_one_identity_check",
      sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
    ),
  }),
);
