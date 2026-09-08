import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull(),
    action: text("action").notNull(),
    subjectId: text("subject_id").notNull(),
    fingerprint: text("fingerprint"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    lookup: index("rate_limit_events_lookup_idx").on(
      table.schoolId,
      table.userId,
      table.scope,
      table.action,
      table.subjectId,
      table.createdAt,
    ),
    fingerprint: index("rate_limit_events_fingerprint_idx").on(
      table.schoolId,
      table.userId,
      table.scope,
      table.subjectId,
      table.fingerprint,
      table.createdAt,
    ),
  }),
);
