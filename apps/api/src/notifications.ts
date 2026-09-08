import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, desc, eq, isNull, lt, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import type { AppDb } from "./types.js";

export const LEARNER_NOTIFICATION_TYPES = [
  "community_post_created",
  "community_post_liked",
  "community_comment",
  "community_comment_liked",
  "community_reply",
  "community_reply_liked",
  "community_membership_granted",
  "course_discussion_comment_created",
  "course_discussion_reacted",
] as const;
export type LearnerNotificationType = (typeof LEARNER_NOTIFICATION_TYPES)[number];

export type LearnerNotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

type LearnerNotificationTarget = {
  schoolId: string;
  learnerId: string;
};

export type LearnerNotificationPreferenceDto = {
  type: LearnerNotificationType;
  appEnabled: boolean;
};

function encodeCursor(date: Date, id: string) {
  return Buffer.from(`${date.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(value: string | undefined) {
  if (!value) return null;
  const decoded = Buffer.from(value, "base64url").toString("utf8");
  const separator = decoded.lastIndexOf("|");
  if (separator < 1) return null;
  const date = new Date(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);
  return !Number.isNaN(date.getTime()) && id ? { date, id } : null;
}

function toDto(row: typeof schema.notifications.$inferSelect): LearnerNotificationDto {
  return {
    id: row.publicId,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    readAt: row.readAt ? serializeDate(row.readAt) : null,
    createdAt: serializeDate(row.createdAt),
  };
}

export async function createLearnerNotification(
  db: AppDb,
  target: LearnerNotificationTarget,
  input: {
    type: string;
    title: string;
    body: string;
    href?: string | null;
  },
  clock: Clock,
) {
  const preference = await db
    .select({ appEnabled: schema.learnerNotificationPreferences.appEnabled })
    .from(schema.learnerNotificationPreferences)
    .where(
      and(
        eq(schema.learnerNotificationPreferences.schoolId, target.schoolId),
        eq(schema.learnerNotificationPreferences.learnerId, target.learnerId),
        eq(schema.learnerNotificationPreferences.type, input.type),
      ),
    )
    .limit(1);
  if (preference[0] && !preference[0].appEnabled) return null;

  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("ntf", clock),
    schoolId: target.schoolId,
    learnerId: target.learnerId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt: now,
  };
  await db.insert(schema.notifications).values(row);
  return toDto(row);
}

export async function listLearnerNotificationPreferences(
  db: AppDb,
  target: LearnerNotificationTarget,
): Promise<{ items: LearnerNotificationPreferenceDto[] }> {
  const rows = await db
    .select({
      type: schema.learnerNotificationPreferences.type,
      appEnabled: schema.learnerNotificationPreferences.appEnabled,
    })
    .from(schema.learnerNotificationPreferences)
    .where(
      and(
        eq(schema.learnerNotificationPreferences.schoolId, target.schoolId),
        eq(schema.learnerNotificationPreferences.learnerId, target.learnerId),
      ),
    );
  const preferences = new Map(rows.map((row) => [row.type, row.appEnabled]));
  return {
    items: LEARNER_NOTIFICATION_TYPES.map((type) => ({
      type,
      appEnabled: preferences.get(type) ?? true,
    })),
  };
}

export async function updateLearnerNotificationPreference(
  db: AppDb,
  target: LearnerNotificationTarget,
  type: string,
  appEnabled: boolean,
  clock: Clock,
): Promise<Result<LearnerNotificationPreferenceDto>> {
  if (!(LEARNER_NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const now = clock.now();
  await db
    .insert(schema.learnerNotificationPreferences)
    .values({
      id: uuidv7(clock),
      schoolId: target.schoolId,
      learnerId: target.learnerId,
      type,
      appEnabled,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        schema.learnerNotificationPreferences.schoolId,
        schema.learnerNotificationPreferences.learnerId,
        schema.learnerNotificationPreferences.type,
      ],
      set: { appEnabled, updatedAt: now },
    });
  return {
    ok: true,
    value: { type: type as LearnerNotificationType, appEnabled },
  };
}

export async function listLearnerNotifications(
  db: AppDb,
  target: LearnerNotificationTarget,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: LearnerNotificationDto[]; nextCursor: string | null }>> {
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor) {
    return {
      ok: false,
      error: createPlatformError("validation_failed"),
    };
  }
  const conditions = [
    eq(schema.notifications.schoolId, target.schoolId),
    eq(schema.notifications.learnerId, target.learnerId),
  ];
  if (cursor) {
    conditions.push(
      or(
        lt(schema.notifications.createdAt, cursor.date),
        and(
          eq(schema.notifications.createdAt, cursor.date),
          lt(schema.notifications.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(and(...conditions))
    .orderBy(desc(schema.notifications.createdAt), desc(schema.notifications.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  return {
    ok: true,
    value: {
      items: page.map(toDto),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id)
          : null,
    },
  };
}

export async function markLearnerNotificationRead(
  db: AppDb,
  target: LearnerNotificationTarget,
  notificationPublicId: string,
  clock: Clock,
): Promise<Result<LearnerNotificationDto>> {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.schoolId, target.schoolId),
        eq(schema.notifications.learnerId, target.learnerId),
        eq(schema.notifications.publicId, notificationPublicId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  const readAt = row.readAt ?? clock.now();
  await db
    .update(schema.notifications)
    .set({ readAt })
    .where(eq(schema.notifications.id, row.id));
  return { ok: true, value: toDto({ ...row, readAt }) };
}

export async function markAllLearnerNotificationsRead(
  db: AppDb,
  target: LearnerNotificationTarget,
  clock: Clock,
) {
  await db
    .update(schema.notifications)
    .set({ readAt: clock.now() })
    .where(
      and(
        eq(schema.notifications.schoolId, target.schoolId),
        eq(schema.notifications.learnerId, target.learnerId),
        isNull(schema.notifications.readAt),
      ),
    );
  return { ok: true as const, value: { updated: true } };
}
