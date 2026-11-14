import { sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { schools } from "./schools.js";

/**
 * One row per CourseLit trial ever started. An account gets one trial
 * (docs/wip/plan-limits.md, section 3). `school_id` has no foreign key, so the
 * row outlives the school and deleting a school can't buy a second trial.
 */
export const schoolTrials = pgTable(
  "school_trials",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** The owner's verified email, lowercased, `+tags` stripped, Gmail dots ignored. */
    normalizedEmail: text("normalized_email").notNull(),
    schoolId: uuid("school_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    endReason: text("end_reason").$type<"purchased" | "expired">(),
  },
  (table) => [
    uniqueIndex("school_trials_user_uidx").on(table.userId),
    uniqueIndex("school_trials_email_uidx").on(table.normalizedEmail),
    index("school_trials_school_idx").on(table.schoolId),
    check(
      "school_trials_end_reason_check",
      sql`${table.endReason} IS NULL OR ${table.endReason} IN ('purchased', 'expired')`,
    ),
  ],
);

/**
 * Bytes claimed by uploads that were authorized but not finalized yet, so
 * parallel uploads can't together pass a storage limit (S1). A row goes away
 * when its upload is finalized or `expires_at` passes.
 */
export const mediaUploadReservations = pgTable(
  "media_upload_reservations",
  {
    id: uuid("id").primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** Set for a learner's upload, which also counts toward their own budget. */
    schoolAccountId: uuid("school_account_id"),
    bytes: bigint("bytes", { mode: "number" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("media_upload_reservations_school_idx").on(table.schoolId, table.expiresAt),
    check("media_upload_reservations_bytes_check", sql`${table.bytes} > 0`),
  ],
);
