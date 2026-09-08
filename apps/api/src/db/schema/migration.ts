import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

export const migrationRuns = pgTable("migration_runs", {
  id: uuid("id").primaryKey(),
  sourceSystem: text("source_system").notNull(),
  scope: text("scope").notNull(),
  mode: text("mode").$type<"dry_run" | "apply">().notNull(),
  status: text("status").$type<"running" | "succeeded" | "failed">().notNull(),
  counts: jsonb("counts").$type<Record<string, number>>().notNull().default({}),
  errorCode: text("error_code"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const migrationMappings = pgTable(
  "migration_mappings",
  {
    id: uuid("id").primaryKey(),
    sourceSystem: text("source_system").notNull(),
    sourceCollection: text("source_collection").notNull(),
    sourceId: text("source_id").notNull(),
    targetTable: text("target_table").notNull(),
    targetId: text("target_id").notNull(),
    schoolId: uuid("school_id").references(() => schools.id, {
      onDelete: "set null",
    }),
    runId: uuid("run_id")
      .notNull()
      .references(() => migrationRuns.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    sourceTarget: uniqueIndex("migration_mappings_source_target_uidx").on(
      table.sourceSystem,
      table.sourceCollection,
      table.sourceId,
      table.targetTable,
    ),
  }),
);

export const migrationRejections = pgTable("migration_rejections", {
  id: uuid("id").primaryKey(),
  runId: uuid("run_id")
    .notNull()
    .references(() => migrationRuns.id, { onDelete: "cascade" }),
  sourceSystem: text("source_system").notNull(),
  sourceCollection: text("source_collection").notNull(),
  sourceId: text("source_id"),
  code: text("code").notNull(),
  details: jsonb("details").$type<Record<string, string | number | boolean | null>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
