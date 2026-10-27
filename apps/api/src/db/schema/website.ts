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
import { communities } from "./communities.js";
import { products } from "./products.js";
import { schoolAccounts, schools } from "./schools.js";

export type WebsiteWidgetRow = {
  widgetId: string;
  name: string;
  deletable: boolean;
  moveable: boolean;
  shared: boolean;
  settings?: Record<string, unknown>;
};

export type SharedWidgetsRow = {
  header: WebsiteWidgetRow;
  footer: WebsiteWidgetRow;
};

/** One website configuration per school. Header and footer settings are
 * stored once here; page rows keep only placeholders for them. Shared widgets
 * follow the page draft/publish model: page saves write `draftSharedWidgets`
 * and publishing any page promotes them to `sharedWidgets`. */
export const websiteSettings = pgTable("website_settings", {
  schoolId: uuid("school_id")
    .primaryKey()
    .references(() => schools.id, { onDelete: "cascade" }),
  title: text("title"),
  subtitle: text("subtitle"),
  logo: jsonb("logo").$type<MediaRef | null>(),
  /** Built-in themes use their logical id; custom themes use their public id. */
  themeId: text("theme_id"),
  sharedWidgets: jsonb("shared_widgets").$type<SharedWidgetsRow>().notNull(),
  draftSharedWidgets: jsonb("draft_shared_widgets").$type<SharedWidgetsRow>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const websiteThemes = pgTable(
  "website_themes",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    style: jsonb("style").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    school: index("website_themes_school_idx").on(table.schoolId),
  }),
);

/** Builder pages. Editors write the draft columns; publishing copies them
 * into the published columns read by the storefront. A page owned by a
 * product or community is that resource's sales page. */
export const websitePages = pgTable(
  "website_pages",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    communityId: uuid("community_id").references(() => communities.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    deletable: boolean("deletable").notNull().default(true),

    layout: jsonb("layout").$type<WebsiteWidgetRow[]>().notNull().default([]),
    title: text("title"),
    description: text("description"),
    socialImage: jsonb("social_image").$type<MediaRef | null>(),
    robotsAllowed: boolean("robots_allowed"),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    draftLayout: jsonb("draft_layout").$type<WebsiteWidgetRow[]>().notNull().default([]),
    draftTitle: text("draft_title"),
    draftDescription: text("draft_description"),
    draftSocialImage: jsonb("draft_social_image").$type<MediaRef | null>(),
    draftRobotsAllowed: boolean("draft_robots_allowed"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolSlug: uniqueIndex("website_pages_school_slug_uidx").on(
      table.schoolId,
      table.slug,
    ),
    product: uniqueIndex("website_pages_product_uidx")
      .on(table.productId)
      .where(sql`${table.productId} IS NOT NULL`),
    community: uniqueIndex("website_pages_community_uidx")
      .on(table.communityId)
      .where(sql`${table.communityId} IS NOT NULL`),
  }),
);

/** Blog posts use the same draft/publish split as pages. */
export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    authorSchoolAccountId: uuid("author_school_account_id").references(
      () => schoolAccounts.id,
      { onDelete: "set null" },
    ),
    slug: text("slug").notNull(),

    title: text("title"),
    content: jsonb("content").$type<Record<string, unknown>>(),
    excerpt: text("excerpt"),
    featuredImage: jsonb("featured_image").$type<MediaRef | null>(),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    publishedAt: timestamp("published_at", { withTimezone: true }),

    draftTitle: text("draft_title").notNull(),
    draftContent: jsonb("draft_content").$type<Record<string, unknown>>().notNull(),
    draftExcerpt: text("draft_excerpt"),
    draftFeaturedImage: jsonb("draft_featured_image").$type<MediaRef | null>(),
    draftMeta: jsonb("draft_meta").$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolSlug: uniqueIndex("blog_posts_school_slug_uidx").on(table.schoolId, table.slug),
    published: index("blog_posts_school_published_idx").on(
      table.schoolId,
      table.publishedAt,
    ),
  }),
);
