import { readFileSync } from "node:fs";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq, or } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";
const NOTIFICATION_COLLECTION = "notifications";
const PREFERENCE_COLLECTION = "notificationPreferences";

type JsonRecord = Record<string, unknown>;

export type LegacyNotificationExport = {
  notifications: readonly unknown[];
  preferences: readonly unknown[];
};

export type NotificationImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  skippedArchived: number;
  preferencesImported: number;
  rejected: number;
};

export type NotificationImportRejection = {
  sourceCollection: string;
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_notification_id"
    | "invalid_preference_id"
    | "invalid_timestamps"
    | "unsupported_type"
    | "school_mapping_missing"
    | "learner_mapping_missing"
    | "duplicate_source_id"
    | "mapping_target_missing"
    | "notification_conflict";
  details: Record<string, string | number | boolean | null>;
};

export type NotificationImportResult = {
  runId: string;
  sourceSystem: string;
  mode: "dry_run" | "apply";
  status: "succeeded";
  counts: NotificationImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: NotificationImportRejection[];
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function idValue(value: unknown): string | null {
  const object = asRecord(value);
  if (object && typeof object.$oid === "string") return object.$oid.trim() || null;
  return stringValue(value);
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const object = asRecord(value);
  if (object?.$date !== undefined) return dateValue(object.$date);
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sourceIdFor(record: JsonRecord | null, ...keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = idValue(record[key]);
    if (value) return value;
  }
  return null;
}

function rejection(
  sourceCollection: string,
  sourceId: string | null,
  code: NotificationImportRejection["code"],
  details: NotificationImportRejection["details"] = {},
): NotificationImportRejection {
  return { sourceCollection, sourceId, code, details };
}

function persistableCounts(
  counts: NotificationImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

function targetType(value: unknown): string | null {
  const type = stringValue(value)?.toLowerCase();
  if (!type) return null;
  const aliases: Record<string, string> = {
    community_comment_created: "community_comment",
    community_comment_replied: "community_reply",
    community_reply_created: "community_reply",
  };
  const normalized = aliases[type] ?? type;
  return [
    "community_post_created",
    "community_post_liked",
    "community_comment",
    "community_comment_liked",
    "community_reply",
    "community_reply_liked",
    "community_membership_granted",
    "course_discussion_comment_created",
    "course_discussion_reacted",
  ].includes(normalized)
    ? normalized
    : null;
}

function titleFor(type: string): string {
  const titles: Record<string, string> = {
    community_post_created: "New space post",
    community_post_liked: "Your space post was reacted to",
    community_comment: "New space comment",
    community_comment_liked: "Your space comment was reacted to",
    community_reply: "New space reply",
    community_reply_liked: "Your space reply was reacted to",
    community_membership_granted: "Community membership approved",
    course_discussion_comment_created: "New course discussion comment",
    course_discussion_reacted: "Your course discussion was reacted to",
  };
  return titles[type] ?? "New activity";
}

function hrefFor(record: JsonRecord, metadata: JsonRecord | null): string | null {
  const explicit = stringValue(record.href);
  const isLegacyLearnerCommunityHref =
    explicit?.startsWith("/dashboard/community/") ||
    explicit?.startsWith("/community/");
  if (explicit && !isLegacyLearnerCommunityHref) return explicit;
  const communityId = idValue(metadata?.communityId ?? metadata?.communityPublicId);
  const postId = idValue(metadata?.postId ?? metadata?.postPublicId);
  const spaceId = idValue(metadata?.spaceId ?? metadata?.spacePublicId);
  if (spaceId && postId) {
    return `/dashboard/s/${encodeURIComponent(spaceId)}/${encodeURIComponent(postId)}`;
  }
  if (communityId && postId) {
    return "/dashboard";
  }
  const productId = idValue(metadata?.productId ?? metadata?.courseId);
  const lessonId = idValue(metadata?.lessonId);
  if (productId && lessonId) {
    return `/dashboard/courses/${encodeURIComponent(productId)}/${encodeURIComponent(lessonId)}`;
  }
  return null;
}

async function learnerTarget(
  db: AppDb,
  sourceSystem: string,
  sourceUserId: string | null,
): Promise<{ id: string; schoolId: string } | null> {
  if (!sourceUserId) return null;
  if (isUuid(sourceUserId)) {
    const direct = await db
      .select({ id: schema.schoolAccounts.id, schoolId: schema.schoolAccounts.schoolId })
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, sourceUserId))
      .limit(1);
    if (direct[0]) return direct[0];
  }
  const mappings = await db
    .select({ targetId: schema.migrationMappings.targetId })
    .from(schema.migrationMappings)
    .where(
      and(
        eq(schema.migrationMappings.sourceSystem, sourceSystem),
        eq(schema.migrationMappings.sourceCollection, "users"),
        eq(schema.migrationMappings.sourceId, sourceUserId),
        or(eq(schema.migrationMappings.targetTable, "school_accounts"), eq(schema.migrationMappings.targetTable, "learners")),
      ),
    )
    .limit(1);
  if (!mappings[0]) return null;
  const learner = await db
    .select({ id: schema.schoolAccounts.id, schoolId: schema.schoolAccounts.schoolId })
    .from(schema.schoolAccounts)
    .where(eq(schema.schoolAccounts.id, mappings[0].targetId))
    .limit(1);
  return learner[0] ?? null;
}

export function readLegacyNotificationExport(path: string): LegacyNotificationExport {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return { notifications: parsed, preferences: [] };
  const object = asRecord(parsed);
  if (!object || !Array.isArray(object.notifications)) {
    throw new Error("notification_export_must_be_array_or_object_with_notifications_array");
  }
  if (object.preferences !== undefined && !Array.isArray(object.preferences)) {
    throw new Error("notification_export_preferences_must_be_array");
  }
  return {
    notifications: object.notifications as readonly unknown[],
    preferences: (object.preferences ?? []) as readonly unknown[],
  };
}

export async function importLegacyNotifications(
  db: AppDb,
  input: {
    exportData: LegacyNotificationExport;
    clock: Clock;
    mode?: "dry_run" | "apply";
    sourceSystem?: string;
    retentionSince?: Date;
  },
): Promise<NotificationImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const retentionSince = input.retentionSince ?? new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const runId = uuidv7(input.clock);
  const counts: NotificationImportCounts = {
    seen: input.exportData.notifications.length + input.exportData.preferences.length,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    skippedArchived: 0,
    preferencesImported: 0,
    rejected: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: NotificationImportRejection[] = [];
  const seen = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: "notifications",
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: NotificationImportRejection) => {
    rejections.push(item);
    counts.rejected += 1;
    rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
  };

  try {
    for (const raw of input.exportData.notifications) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "notificationId", "_id", "id");
      if (!record) {
        addRejection(rejection(NOTIFICATION_COLLECTION, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(NOTIFICATION_COLLECTION, null, "invalid_notification_id"));
        continue;
      }
      const key = `${NOTIFICATION_COLLECTION}:${sourceId}`;
      if (seen.has(key)) {
        addRejection(rejection(NOTIFICATION_COLLECTION, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(key);
      const existingMapping = await db
        .select()
        .from(schema.migrationMappings)
        .where(
          and(
            eq(schema.migrationMappings.sourceSystem, sourceSystem),
            eq(schema.migrationMappings.sourceCollection, NOTIFICATION_COLLECTION),
            eq(schema.migrationMappings.sourceId, sourceId),
            eq(schema.migrationMappings.targetTable, "notifications"),
          ),
        )
        .limit(1);
      if (existingMapping[0]) {
        const target = await db
          .select({ id: schema.notifications.id })
          .from(schema.notifications)
          .where(eq(schema.notifications.id, existingMapping[0].targetId))
          .limit(1);
        if (!target[0]) {
          addRejection(rejection(NOTIFICATION_COLLECTION, sourceId, "mapping_target_missing", { targetId: existingMapping[0].targetId }));
        } else {
          counts.alreadyMapped += 1;
        }
        continue;
      }
      const createdAt = record.createdAt === undefined ? now : dateValue(record.createdAt);
      const updatedAt = record.updatedAt === undefined ? createdAt : dateValue(record.updatedAt);
      if (!createdAt || !updatedAt) {
        addRejection(rejection(NOTIFICATION_COLLECTION, sourceId, "invalid_timestamps"));
        continue;
      }
      if (record.read === true && createdAt < retentionSince) {
        counts.skippedArchived += 1;
        continue;
      }
      const type = targetType(record.activityType ?? record.type);
      if (!type) {
        addRejection(rejection(NOTIFICATION_COLLECTION, sourceId, "unsupported_type", { type: stringValue(record.activityType ?? record.type) }));
        continue;
      }
      const learner = await learnerTarget(db, sourceSystem, sourceIdFor(record, "forUserId", "learnerId", "userId"));
      if (!learner) {
        addRejection(rejection(NOTIFICATION_COLLECTION, sourceId, "learner_mapping_missing"));
        continue;
      }
      const metadata = asRecord(record.metadata);
      const body = stringValue(record.message ?? record.body) ?? titleFor(type);
      const title = stringValue(record.title) ?? titleFor(type);
      const href = hrefFor(record, metadata);
      counts.ready += 1;
      if (mode === "dry_run") continue;
      const targetId = uuidv7(input.clock);
      await db.insert(schema.notifications).values({
        id: targetId,
        publicId: sourceId,
        schoolId: learner.schoolId,
        schoolAccountId: learner.id,
        type,
        title,
        body,
        href,
        readAt: record.read === true ? dateValue(record.readAt) ?? updatedAt : null,
        createdAt,
      });
      await db.insert(schema.migrationMappings).values({
        id: uuidv7(input.clock),
        sourceSystem,
        sourceCollection: NOTIFICATION_COLLECTION,
        sourceId,
        targetTable: "notifications",
        targetId,
        schoolId: learner.schoolId,
        runId,
        createdAt: now,
      });
      counts.imported += 1;
    }

    for (const raw of input.exportData.preferences) {
      const record = asRecord(raw);
      const userId = sourceIdFor(record, "userId", "forUserId", "learnerId");
      const activityType = targetType(record?.activityType ?? record?.type);
      const sourceId = sourceIdFor(record, "preferenceId", "_id", "id") ?? (userId && activityType ? `${userId}:${activityType}` : null);
      if (!record) {
        addRejection(rejection(PREFERENCE_COLLECTION, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(PREFERENCE_COLLECTION, null, "invalid_preference_id"));
        continue;
      }
      const key = `${PREFERENCE_COLLECTION}:${sourceId}`;
      if (seen.has(key)) {
        addRejection(rejection(PREFERENCE_COLLECTION, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(key);
      const learner = await learnerTarget(db, sourceSystem, userId);
      if (!learner) {
        addRejection(rejection(PREFERENCE_COLLECTION, sourceId, "learner_mapping_missing"));
        continue;
      }
      if (!activityType) {
        addRejection(rejection(PREFERENCE_COLLECTION, sourceId, "unsupported_type"));
        continue;
      }
      const existingMapping = await db
        .select()
        .from(schema.migrationMappings)
        .where(
          and(
            eq(schema.migrationMappings.sourceSystem, sourceSystem),
            eq(schema.migrationMappings.sourceCollection, PREFERENCE_COLLECTION),
            eq(schema.migrationMappings.sourceId, sourceId),
            eq(schema.migrationMappings.targetTable, "learnerNotificationPreferences"),
          ),
        )
        .limit(1);
      if (existingMapping[0]) {
        const target = await db
          .select({ id: schema.learnerNotificationPreferences.id })
          .from(schema.learnerNotificationPreferences)
          .where(eq(schema.learnerNotificationPreferences.id, existingMapping[0].targetId))
          .limit(1);
        if (!target[0]) {
          addRejection(rejection(PREFERENCE_COLLECTION, sourceId, "mapping_target_missing", { targetId: existingMapping[0].targetId }));
        } else {
          counts.alreadyMapped += 1;
        }
        continue;
      }
      const existing = await db
        .select({ id: schema.learnerNotificationPreferences.id })
        .from(schema.learnerNotificationPreferences)
        .where(
          and(
            eq(schema.learnerNotificationPreferences.schoolId, learner.schoolId),
            eq(schema.learnerNotificationPreferences.schoolAccountId, learner.id),
            eq(schema.learnerNotificationPreferences.type, activityType),
          ),
        )
        .limit(1);
      const channels = Array.isArray(record.channels)
        ? record.channels.filter((item): item is string => typeof item === "string").map((item) => item.toLowerCase())
        : [];
      const appEnabled = channels.length === 0 || channels.includes("app") || channels.includes("in_app") || channels.includes("web") || channels.includes("all");
      const emailEnabled = channels.length === 0 || channels.includes("email") || channels.includes("all");
      const createdAt = record.createdAt === undefined ? now : dateValue(record.createdAt);
      const updatedAt = record.updatedAt === undefined ? createdAt : dateValue(record.updatedAt);
      if (!createdAt || !updatedAt) {
        addRejection(rejection(PREFERENCE_COLLECTION, sourceId, "invalid_timestamps"));
        continue;
      }
      counts.ready += 1;
      if (mode === "dry_run") continue;
      const targetId = existing[0]?.id ?? uuidv7(input.clock);
      await db
        .insert(schema.learnerNotificationPreferences)
        .values({ id: targetId, schoolId: learner.schoolId, schoolAccountId: learner.id, type: activityType, appEnabled, emailEnabled, createdAt, updatedAt })
        .onConflictDoUpdate({
          target: [schema.learnerNotificationPreferences.schoolId, schema.learnerNotificationPreferences.schoolAccountId, schema.learnerNotificationPreferences.type],
          set: { appEnabled, emailEnabled, updatedAt },
        });
      if (!existing[0]) {
        await db.insert(schema.migrationMappings).values({
          id: uuidv7(input.clock),
          sourceSystem,
          sourceCollection: PREFERENCE_COLLECTION,
          sourceId,
          targetTable: "learnerNotificationPreferences",
          targetId,
          schoolId: learner.schoolId,
          runId,
          createdAt: now,
        });
      }
      counts.imported += 1;
      counts.preferencesImported += 1;
    }

    if (rejections.length > 0) {
      await db.insert(schema.migrationRejections).values(
        rejections.map((item) => ({
          id: uuidv7(input.clock),
          runId,
          sourceSystem,
          sourceCollection: item.sourceCollection,
          sourceId: item.sourceId,
          code: item.code,
          details: item.details,
          createdAt: now,
        })),
      );
    }
    await db
      .update(schema.migrationRuns)
      .set({ status: "succeeded", counts: persistableCounts(counts, rejectionByCode), completedAt: input.clock.now() })
      .where(eq(schema.migrationRuns.id, runId));
  } catch (error) {
    await db
      .update(schema.migrationRuns)
      .set({ status: "failed", counts: persistableCounts(counts, rejectionByCode), errorCode: error instanceof Error ? error.name : "unknown_error", completedAt: input.clock.now() })
      .where(eq(schema.migrationRuns.id, runId));
    throw error;
  }

  return { runId, sourceSystem, mode, status: "succeeded", counts, rejectionByCode, rejections };
}
