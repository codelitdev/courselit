import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, count, desc, eq, isNull, lt, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { publishNotification } from "./notification-stream.js";
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

export type NotificationDto = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type LearnerNotificationDto = NotificationDto;

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export type LearnerNotificationTarget = {
  schoolId: string;
  schoolAccountId?: string;
  learnerId?: string;
};

function targetAccountId(target: LearnerNotificationTarget): string {
  const id = target.schoolAccountId ?? target.learnerId;
  if (!id) throw new Error("Target schoolAccountId is required");
  return id;
}

export type AdminNotificationTarget = {
  schoolId: string;
  schoolAccountId?: string;
  adminUserId?: string;
};

type NotificationTarget = LearnerNotificationTarget | AdminNotificationTarget;

export type LearnerNotificationPreferenceDto = {
  type: LearnerNotificationType;
  appEnabled: boolean;
  emailEnabled: boolean;
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

function toDto(row: typeof schema.notifications.$inferSelect): NotificationDto {
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

async function resolveAdminAccountId(
  db: AppDb,
  target: AdminNotificationTarget,
): Promise<string> {
  if (target.schoolAccountId) return target.schoolAccountId;
  if (target.adminUserId) {
    const [membership] = await db
      .select({ schoolAccountId: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .innerJoin(
        schema.memberships,
        eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
      )
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, target.schoolId),
          eq(schema.schoolAccounts.userId, target.adminUserId),
        ),
      )
      .limit(1);
    if (membership?.schoolAccountId) {
      return membership.schoolAccountId;
    }
  }
  throw new Error("Target schoolAccountId could not be resolved");
}

export async function createAdminNotification(
  db: AppDb,
  target: AdminNotificationTarget,
  input: {
    type: string;
    title: string;
    body: string;
    href?: string | null;
  },
  clock: Clock,
) {
  const accountId = await resolveAdminAccountId(db, target);
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("ntf", clock),
    schoolId: target.schoolId,
    schoolAccountId: accountId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt: now,
  };
  await db.insert(schema.notifications).values(row);
  const notification = toDto(row);
  publishNotification({
    audience: "admin",
    schoolId: target.schoolId,
    recipientId: accountId,
    notification,
  });
  return notification;
}

export async function createSchoolAdminNotifications(
  db: AppDb,
  schoolId: string,
  input: {
    type: string;
    title: string;
    body: string;
    href?: string | null;
    excludeSchoolAccountId?: string;
  },
  clock: Clock,
) {
  const admins = await db
    .select({ schoolAccountId: schema.memberships.schoolAccountId })
    .from(schema.memberships)
    .where(eq(schema.memberships.schoolId, schoolId));
  await Promise.all(
    admins
      .filter(
        (admin) =>
          Boolean(admin.schoolAccountId) &&
          admin.schoolAccountId !== input.excludeSchoolAccountId,
      )
      .map((admin) =>
        createAdminNotification(
          db,
          { schoolId, schoolAccountId: admin.schoolAccountId! },
          input,
          clock,
        ),
      ),
  );
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
        eq(
          schema.learnerNotificationPreferences.schoolAccountId,
          targetAccountId(target),
        ),
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
    schoolAccountId: targetAccountId(target),
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt: now,
  };
  await db.insert(schema.notifications).values(row);
  const notification = toDto(row);
  publishNotification({
    audience: "learner",
    schoolId: target.schoolId,
    recipientId: targetAccountId(target),
    notification,
  });
  return notification;
}

export async function listLearnerNotificationPreferences(
  db: AppDb,
  target: LearnerNotificationTarget,
): Promise<{ items: LearnerNotificationPreferenceDto[] }> {
  const rows = await db
    .select({
      type: schema.learnerNotificationPreferences.type,
      appEnabled: schema.learnerNotificationPreferences.appEnabled,
      emailEnabled: schema.learnerNotificationPreferences.emailEnabled,
    })
    .from(schema.learnerNotificationPreferences)
    .where(
      and(
        eq(schema.learnerNotificationPreferences.schoolId, target.schoolId),
        eq(
          schema.learnerNotificationPreferences.schoolAccountId,
          targetAccountId(target),
        ),
      ),
    );
  const preferences = new Map(
    rows.map((row) => [
      row.type,
      { appEnabled: row.appEnabled, emailEnabled: row.emailEnabled },
    ]),
  );
  return {
    items: LEARNER_NOTIFICATION_TYPES.map((type) => ({
      type,
      appEnabled: preferences.get(type)?.appEnabled ?? true,
      emailEnabled: preferences.get(type)?.emailEnabled ?? true,
    })),
  };
}

export async function updateLearnerNotificationPreference(
  db: AppDb,
  target: LearnerNotificationTarget,
  type: string,
  appEnabled: boolean,
  emailEnabled: boolean,
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
      schoolAccountId: targetAccountId(target),
      type,
      appEnabled,
      emailEnabled,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        schema.learnerNotificationPreferences.schoolId,
        schema.learnerNotificationPreferences.schoolAccountId,
        schema.learnerNotificationPreferences.type,
      ],
      set: { appEnabled, emailEnabled, updatedAt: now },
    });
  return {
    ok: true,
    value: {
      type: type as LearnerNotificationType,
      appEnabled,
      emailEnabled,
    },
  };
}

export async function listLearnerNotifications(
  db: AppDb,
  target: LearnerNotificationTarget,
  options: { cursor?: string; limit: number },
): Promise<
  Result<{ items: NotificationDto[]; nextCursor: string | null; total: number }>
> {
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor) {
    return {
      ok: false,
      error: createPlatformError("validation_failed"),
    };
  }
  const baseConditions = [
    eq(schema.notifications.schoolId, target.schoolId),
    eq(schema.notifications.schoolAccountId, targetAccountId(target)),
  ];
  const conditions = [...baseConditions];
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
  const totalRows = await db
    .select({ total: count() })
    .from(schema.notifications)
    .where(and(...baseConditions));
  const page = rows.slice(0, options.limit);
  return {
    ok: true,
    value: {
      items: page.map(toDto),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id)
          : null,
      total: Number(totalRows[0]?.total ?? 0),
    },
  };
}

export async function listAdminNotifications(
  db: AppDb,
  target: AdminNotificationTarget,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: NotificationDto[]; nextCursor: string | null }>> {
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const accountId = await resolveAdminAccountId(db, target);
  const conditions = [
    eq(schema.notifications.schoolId, target.schoolId),
    eq(schema.notifications.schoolAccountId, accountId),
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
): Promise<Result<NotificationDto>> {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.schoolId, target.schoolId),
        eq(schema.notifications.schoolAccountId, targetAccountId(target)),
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
        eq(schema.notifications.schoolAccountId, targetAccountId(target)),
        isNull(schema.notifications.readAt),
      ),
    );
  return { ok: true as const, value: { updated: true } };
}

export async function markAdminNotificationRead(
  db: AppDb,
  target: AdminNotificationTarget,
  notificationPublicId: string,
  clock: Clock,
): Promise<Result<NotificationDto>> {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.schoolId, target.schoolId),
        eq(
          schema.notifications.schoolAccountId,
          await resolveAdminAccountId(db, target),
        ),
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

export async function markAllAdminNotificationsRead(
  db: AppDb,
  target: AdminNotificationTarget,
  clock: Clock,
) {
  await db
    .update(schema.notifications)
    .set({ readAt: clock.now() })
    .where(
      and(
        eq(schema.notifications.schoolId, target.schoolId),
        eq(
          schema.notifications.schoolAccountId,
          await resolveAdminAccountId(db, target),
        ),
        isNull(schema.notifications.readAt),
      ),
    );
  return { ok: true as const, value: { updated: true } };
}
