import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { learners } from "./catalog.js";
import { schools } from "./schools.js";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey(),
    publicId: text("public_id").notNull().unique(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    learnerFeed: index("notifications_learner_feed_idx").on(
      table.schoolId,
      table.learnerId,
      table.createdAt,
      table.id,
    ),
  }),
);

export const learnerNotificationPreferences = pgTable(
  "learner_notification_preferences",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    appEnabled: boolean("app_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    learnerType: uniqueIndex("learner_notification_preferences_type_uidx").on(
      table.schoolId,
      table.learnerId,
      table.type,
    ),
  }),
);
