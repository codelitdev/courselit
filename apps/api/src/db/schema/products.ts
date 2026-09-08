import {
  boolean,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth.generated.js";
import { schools } from "./schools.js";

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"course" | "download">().notNull(),
    status: text("status").$type<"draft" | "published">().notNull().default("draft"),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    privacy: text("privacy")
      .$type<"public" | "unlisted">()
      .notNull()
      .default("unlisted"),
    leadMagnet: boolean("lead_magnet").notNull().default(false),
    certificate: boolean("certificate").notNull().default(false),
    discussions: boolean("discussions").notNull().default(false),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    schoolSlug: uniqueIndex("products_school_slug_uidx").on(table.schoolId, table.slug),
  }),
);

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey(),
  schoolId: uuid("school_id").references(() => schools.id, {
    onDelete: "cascade",
  }),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  requestId: text("request_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
