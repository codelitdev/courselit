import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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

const targetFields = {
  schoolId: uuid("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  entityType: text("entity_type").$type<"lesson" | "product">().notNull(),
  entityId: uuid("entity_id").notNull(),
};

const identityCheck = (name: string) =>
  check(
    name,
    sql`((learner_id IS NOT NULL)::int + (admin_user_id IS NOT NULL)::int) = 1`,
  );

export const productDiscussionComments = pgTable(
  "product_discussion_comments",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ...targetFields,
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "set null",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    likesCount: integer("likes_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    deletedByRole: text("deleted_by_role").$type<"author" | "moderator" | "system">(),
    deleteReason: text("delete_reason"),
    restoredAt: timestamp("restored_at", { withTimezone: true }),
    restoredBy: text("restored_by"),
    isEdited: boolean("is_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    target: index("product_discussion_comments_target_idx").on(
      table.schoolId,
      table.productId,
      table.entityType,
      table.entityId,
      table.createdAt,
      table.id,
    ),
    oneAuthor: identityCheck("product_discussion_comments_one_author_check"),
  }),
);

export const productDiscussionReplies = pgTable(
  "product_discussion_replies",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ...targetFields,
    commentId: uuid("comment_id")
      .notNull()
      .references(() => productDiscussionComments.id, { onDelete: "cascade" }),
    parentReplyId: uuid("parent_reply_id"),
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "set null",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    content: text("content").notNull(),
    likesCount: integer("likes_count").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by"),
    deletedByRole: text("deleted_by_role").$type<"author" | "moderator" | "system">(),
    deleteReason: text("delete_reason"),
    restoredAt: timestamp("restored_at", { withTimezone: true }),
    restoredBy: text("restored_by"),
    isEdited: boolean("is_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    comment: index("product_discussion_replies_comment_idx").on(
      table.commentId,
      table.createdAt,
      table.id,
    ),
    parent: index("product_discussion_replies_parent_idx").on(table.parentReplyId),
    oneAuthor: identityCheck("product_discussion_replies_one_author_check"),
  }),
);

export const productDiscussionLikes = pgTable(
  "product_discussion_likes",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ...targetFields,
    contentType: text("content_type").$type<"comment" | "reply">().notNull(),
    contentId: uuid("content_id").notNull(),
    commentId: uuid("comment_id").references(() => productDiscussionComments.id, {
      onDelete: "cascade",
    }),
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    learner: uniqueIndex("product_discussion_likes_learner_uidx")
      .on(table.contentType, table.contentId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("product_discussion_likes_admin_uidx")
      .on(table.contentType, table.contentId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
    target: index("product_discussion_likes_target_idx").on(
      table.productId,
      table.entityType,
      table.entityId,
    ),
    oneIdentity: identityCheck("product_discussion_likes_one_identity_check"),
  }),
);

export const productDiscussionSummaries = pgTable(
  "product_discussion_summaries",
  {
    id: uuid("id").primaryKey(),
    ...targetFields,
    commentsCount: integer("comments_count").notNull().default(0),
    repliesCount: integer("replies_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    activityCountIncludingDeleted: integer("activity_count_including_deleted")
      .notNull()
      .default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull(),
    lastCommentId: text("last_comment_id"),
    lastReplyId: text("last_reply_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    target: uniqueIndex("product_discussion_summaries_target_uidx").on(
      table.schoolId,
      table.productId,
      table.entityType,
      table.entityId,
    ),
    activity: index("product_discussion_summaries_activity_idx").on(
      table.schoolId,
      table.productId,
      table.entityType,
      table.lastActivityAt,
      table.entityId,
    ),
  }),
);

export const productDiscussionSubscribers = pgTable(
  "product_discussion_subscribers",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ...targetFields,
    learnerId: uuid("learner_id").references(() => learners.id, {
      onDelete: "cascade",
    }),
    adminUserId: text("admin_user_id").references(() => user.id, {
      onDelete: "cascade",
    }),
    subscription: boolean("subscription").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    learner: uniqueIndex("product_discussion_subscribers_learner_uidx")
      .on(table.productId, table.entityType, table.entityId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("product_discussion_subscribers_admin_uidx")
      .on(table.productId, table.entityType, table.entityId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
    oneIdentity: identityCheck("product_discussion_subscribers_one_identity_check"),
  }),
);

export const productDiscussionReports = pgTable(
  "product_discussion_reports",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ...targetFields,
    contentType: text("content_type").$type<"comment" | "reply">().notNull(),
    contentId: uuid("content_id").notNull(),
    commentId: uuid("comment_id").references(() => productDiscussionComments.id, {
      onDelete: "cascade",
    }),
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
    learner: uniqueIndex("product_discussion_reports_learner_uidx")
      .on(table.contentType, table.contentId, table.learnerId)
      .where(sql`${table.learnerId} IS NOT NULL`),
    admin: uniqueIndex("product_discussion_reports_admin_uidx")
      .on(table.contentType, table.contentId, table.adminUserId)
      .where(sql`${table.adminUserId} IS NOT NULL`),
    target: index("product_discussion_reports_target_idx").on(
      table.schoolId,
      table.productId,
      table.entityType,
      table.entityId,
      table.status,
      table.createdAt,
    ),
    oneIdentity: identityCheck("product_discussion_reports_one_identity_check"),
  }),
);
