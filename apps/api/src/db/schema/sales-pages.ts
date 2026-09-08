import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

export const salesPageResourceTypes = ["product", "community"] as const;
export type SalesPageResourceType = (typeof salesPageResourceTypes)[number];

export const salesPageStatuses = [
  "pending",
  "provisioning",
  "ready",
  "failed",
] as const;
export type SalesPageStatus = (typeof salesPageStatuses)[number];

/** CourseLit-owned mapping for pages stored in the school's FrontLit team. */
export const frontlitSalesPages = pgTable(
  "frontlit_sales_pages",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    resourceType: text("resource_type").$type<SalesPageResourceType>().notNull(),
    resourceId: uuid("resource_id").notNull(),
    resourcePublicId: text("resource_public_id").notNull(),
    slug: text("slug").notNull(),
    remotePageId: text("remote_page_id"),
    status: text("status").$type<SalesPageStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    resource: uniqueIndex("frontlit_sales_pages_resource_uidx").on(
      table.schoolId,
      table.resourceType,
      table.resourceId,
    ),
    publicResource: uniqueIndex("frontlit_sales_pages_public_resource_uidx").on(
      table.schoolId,
      table.resourceType,
      table.resourcePublicId,
    ),
    slug: uniqueIndex("frontlit_sales_pages_slug_uidx").on(table.schoolId, table.slug),
    pending: index("frontlit_sales_pages_pending_idx").on(
      table.status,
      table.nextAttemptAt,
    ),
  }),
);
