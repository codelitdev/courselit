import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import type { ActivityType } from "../../activity-types.js";
import { schools } from "./schools.js";

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    actorId: text("actor_id").notNull(),
    type: text("type").$type<ActivityType>().notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    /** Stable for one-time events; a UUID for events that may repeat. */
    dedupeKey: text("dedupe_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    dedupe: uniqueIndex("activities_dedupe_uidx").on(table.dedupeKey),
    schoolTypeDate: index("activities_school_type_date_idx").on(
      table.schoolId,
      table.type,
      table.createdAt,
    ),
    schoolEntityDate: index("activities_school_entity_date_idx").on(
      table.schoolId,
      table.entityId,
      table.createdAt,
    ),
  }),
);

