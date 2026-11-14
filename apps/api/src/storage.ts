import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, count, eq, gt, gte, notExists, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { deleteUnreferencedMedia, type MediaLitClient } from "./media.js";
import { type PlanLimitDeps, schoolLimit } from "./plan-limit.js";
import type { AppDb } from "./types.js";

/**
 * Storage limits (docs/wip/plan-limits.md, section 5, S1, S2 and S24).
 *
 * CourseLit counts storage from its own `media` table plus open upload
 * reservations. The check when an upload is authorized is a courtesy that
 * also reserves the declared size; the real check is at finalize, against
 * the size MediaLit reports, inside a transaction that locks the school.
 */
export const LEARNER_UPLOAD_LIMIT_DEFAULT = 100 * 1024 * 1024;
export const LEARNER_UPLOAD_LIMIT_MAX = 1024 * 1024 * 1024;
/** Learner uploads together may use at most this share of the school's storage. */
export const LEARNER_SHARE = 0.25;
/** Learners can't upload once the school is past this share; the rest is the staff's. */
export const LEARNER_CUTOFF = 0.9;
export const LEARNER_UPLOADS_PER_HOUR = 20;
/** How long a reservation holds space while the browser uploads. */
const RESERVATION_MS = 2 * 60 * 60 * 1000;
/** How long the finalize step holds space while MediaLit seals the asset. */
const HOLD_MS = 15 * 60 * 1000;

export type Uploader = { kind: "staff" } | { kind: "learner"; schoolAccountId: string };

export type StorageDeps = PlanLimitDeps;

type Usage = {
  schoolBytes: number;
  learnerBytes: number;
  accountBytes: number;
};

/** Stored bytes plus open reservations, for the school and its learners. */
async function usage(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string | null,
  now: Date,
  skipReservationId: string | null,
): Promise<Usage> {
  const [stored] = await db
    .select({
      school: sql<number>`coalesce(sum(${schema.media.byteSize}), 0)`,
      learners: sql<number>`coalesce(sum(${schema.media.byteSize}) filter (where ${schema.media.category} = 'user_uploads'), 0)`,
      account: schoolAccountId
        ? sql<number>`coalesce(sum(${schema.media.byteSize}) filter (where ${schema.media.createdBySchoolAccountId} = ${schoolAccountId}), 0)`
        : sql<number>`0`,
    })
    .from(schema.media)
    .where(eq(schema.media.schoolId, schoolId));
  const reservationRows = await db
    .select({
      id: schema.mediaUploadReservations.id,
      bytes: schema.mediaUploadReservations.bytes,
      schoolAccountId: schema.mediaUploadReservations.schoolAccountId,
    })
    .from(schema.mediaUploadReservations)
    .where(
      and(
        eq(schema.mediaUploadReservations.schoolId, schoolId),
        gt(schema.mediaUploadReservations.expiresAt, now),
      ),
    );
  let reserved = 0;
  let learnerReserved = 0;
  let accountReserved = 0;
  for (const row of reservationRows) {
    if (row.id === skipReservationId) continue;
    reserved += row.bytes;
    if (row.schoolAccountId) learnerReserved += row.bytes;
    if (schoolAccountId && row.schoolAccountId === schoolAccountId) accountReserved += row.bytes;
  }
  return {
    schoolBytes: Number(stored?.school ?? 0) + reserved,
    learnerBytes: Number(stored?.learners ?? 0) + learnerReserved,
    accountBytes: Number(stored?.account ?? 0) + accountReserved,
  };
}

async function learnerLimit(db: AppDb, schoolId: string): Promise<number> {
  const [row] = await db
    .select({ bytes: schema.schools.learnerUploadLimitBytes })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  return row?.bytes ?? LEARNER_UPLOAD_LIMIT_DEFAULT;
}

/** Learners never see plan or usage numbers (S2). */
const learnerRefusal = () =>
  createPlatformError("forbidden", { safeDetails: { reason: "upload_not_allowed" } });

const staffRefusal = () =>
  createPlatformError("forbidden", {
    safeDetails: { reason: "plan_limit_reached", limit: "storage_bytes" },
  });

/**
 * Whether `bytes` more fit. Staff are held to the plan's `storage_bytes`;
 * learners also to their own budget, to 25% of the school's storage for all
 * learners together, and to nothing once the school is past 90%.
 */
export function storageRefusal(input: {
  uploader: Uploader;
  bytes: number;
  limit: number | null;
  learnerBudget: number;
  usage: Usage;
}): PlatformError | null {
  const { uploader, bytes, limit, usage: used } = input;
  if (uploader.kind === "learner") {
    if (used.accountBytes + bytes > input.learnerBudget) return learnerRefusal();
    if (limit !== null) {
      if (used.schoolBytes >= limit * LEARNER_CUTOFF) return learnerRefusal();
      if (used.learnerBytes + bytes > limit * LEARNER_SHARE) return learnerRefusal();
      if (used.schoolBytes + bytes > limit) return learnerRefusal();
    }
    return null;
  }
  if (limit !== null && used.schoolBytes + bytes > limit) return staffRefusal();
  return null;
}

async function readLimit(
  deps: StorageDeps,
  schoolId: string,
): Promise<{ ok: true; limit: number | null } | { ok: false; error: PlatformError }> {
  try {
    const limit = await schoolLimit(deps, schoolId, "storage_bytes");
    if (limit !== undefined) return { ok: true, limit };
  } catch {
    // An undeclared key is a bug; refuse like an unreadable plan.
  }
  return {
    ok: false,
    error: createPlatformError("internal_error", {
      safeDetails: { reason: "billing_unavailable" },
    }),
  };
}

/**
 * Called when an upload is authorized: refuses an upload that can't fit,
 * rate-limits learners, and reserves the declared size (S1, S2).
 */
export async function reserveUpload(
  deps: StorageDeps,
  schoolId: string,
  uploader: Uploader,
  bytes: number,
): Promise<PlatformError | null> {
  const now = deps.clock.now();
  const account = uploader.kind === "learner" ? uploader.schoolAccountId : null;
  if (account) {
    const [recent] = await deps.db
      .select({ count: count() })
      .from(schema.mediaUploadReservations)
      .where(
        and(
          eq(schema.mediaUploadReservations.schoolId, schoolId),
          eq(schema.mediaUploadReservations.schoolAccountId, account),
          gte(
            schema.mediaUploadReservations.createdAt,
            new Date(now.getTime() - 60 * 60 * 1000),
          ),
        ),
      );
    if (Number(recent?.count ?? 0) >= LEARNER_UPLOADS_PER_HOUR) {
      return createPlatformError("rate_limited");
    }
  }
  const limit = await readLimit(deps, schoolId);
  if (!limit.ok) return limit.error;
  const refused = storageRefusal({
    uploader,
    bytes,
    limit: limit.limit,
    learnerBudget: await learnerLimit(deps.db, schoolId),
    usage: await usage(deps.db, schoolId, account, now, null),
  });
  if (refused) return refused;
  await deps.db.insert(schema.mediaUploadReservations).values({
    id: uuidv7(deps.clock),
    schoolId,
    schoolAccountId: account,
    bytes,
    expiresAt: new Date(now.getTime() + RESERVATION_MS),
    createdAt: now,
  });
  return null;
}

/**
 * Called at finalize with the size MediaLit reports. In one transaction that
 * locks the school, it releases the uploader's oldest reservation and, if
 * the real size fits, holds it until the media row exists. Returns the
 * hold's id, to pass to `releaseHold` once the row is saved.
 */
export async function admitUpload(
  deps: StorageDeps,
  schoolId: string,
  uploader: Uploader,
  bytes: number,
): Promise<{ ok: true; holdId: string } | { ok: false; error: PlatformError }> {
  const limit = await readLimit(deps, schoolId);
  if (!limit.ok) return limit;
  const learnerBudget = await learnerLimit(deps.db, schoolId);
  const account = uploader.kind === "learner" ? uploader.schoolAccountId : null;
  const now = deps.clock.now();
  return deps.db.transaction(async (tx) => {
    const db = tx as unknown as AppDb;
    // Serializes finalizes for the school, so two can't both fit the last space.
    await db.select({ id: schema.schools.id }).from(schema.schools)
      .where(eq(schema.schools.id, schoolId))
      .for("update");
    const [reservation] = await db
      .select({ id: schema.mediaUploadReservations.id })
      .from(schema.mediaUploadReservations)
      .where(
        and(
          eq(schema.mediaUploadReservations.schoolId, schoolId),
          gt(schema.mediaUploadReservations.expiresAt, now),
          account
            ? eq(schema.mediaUploadReservations.schoolAccountId, account)
            : sql`${schema.mediaUploadReservations.schoolAccountId} is null`,
        ),
      )
      .orderBy(asc(schema.mediaUploadReservations.createdAt))
      .limit(1);
    const refused = storageRefusal({
      uploader,
      bytes,
      limit: limit.limit,
      learnerBudget,
      usage: await usage(db, schoolId, account, now, reservation?.id ?? null),
    });
    if (refused) return { ok: false as const, error: refused };
    if (reservation) {
      await db
        .delete(schema.mediaUploadReservations)
        .where(eq(schema.mediaUploadReservations.id, reservation.id));
    }
    const holdId = uuidv7(deps.clock);
    await db.insert(schema.mediaUploadReservations).values({
      id: holdId,
      schoolId,
      schoolAccountId: account,
      bytes,
      expiresAt: new Date(now.getTime() + HOLD_MS),
      createdAt: now,
    });
    return { ok: true as const, holdId };
  });
}

/** Frees a finalize hold once the media row is saved, or when finalizing failed. */
export async function releaseHold(db: AppDb, holdId: string): Promise<void> {
  await db
    .delete(schema.mediaUploadReservations)
    .where(eq(schema.mediaUploadReservations.id, holdId));
}

/** Removes expired reservations. Run by the worker. */
export async function pruneReservations(db: AppDb, now: Date): Promise<number> {
  const removed = await db
    .delete(schema.mediaUploadReservations)
    .where(sql`${schema.mediaUploadReservations.expiresAt} <= ${now}`)
    .returning({ id: schema.mediaUploadReservations.id });
  return removed.length;
}

/** Used storage, for the usage screen (M8). */
export async function storageUsed(
  db: AppDb,
  schoolId: string,
  now: Date,
): Promise<{ total: number; learners: number }> {
  const used = await usage(db, schoolId, null, now, null);
  return { total: used.schoolBytes, learners: used.learnerBytes };
}


/**
 * Whether a learner may upload community media: only with an active
 * community membership that lets them post (S24).
 */
export async function learnerMayUploadCommunityMedia(
  db: AppDb,
  schoolId: string,
  schoolAccountId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.learnerMemberships.id })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.status, "active"),
        sql`coalesce(${schema.learnerMemberships.role}, 'post') <> 'comment'`,
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** The storage rules a media upload goes through, bound to a request's deps. */
export type StorageGate = {
  reserve(schoolId: string, uploader: Uploader, bytes: number): Promise<PlatformError | null>;
  admit(
    schoolId: string,
    uploader: Uploader,
    bytes: number,
  ): Promise<{ ok: true; holdId: string } | { ok: false; error: PlatformError }>;
  release(holdId: string): Promise<void>;
};

export function storageGate(deps: StorageDeps): StorageGate {
  return {
    reserve: (schoolId, uploader, bytes) => reserveUpload(deps, schoolId, uploader, bytes),
    admit: (schoolId, uploader, bytes) => admitUpload(deps, schoolId, uploader, bytes),
    release: (holdId) => releaseHold(deps.db, holdId),
  };
}

/** Learner community uploads no post uses after this long are deleted (S24). */
export const UNUSED_LEARNER_UPLOAD_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes learner community uploads that no post uses a day after they were
 * made (S24), so throwaway learners can't use a school as file hosting.
 * A learner's current avatar is left alone.
 */
export async function sweepUnusedLearnerUploads(
  db: AppDb,
  client: MediaLitClient,
  clock: Clock,
): Promise<number> {
  const cutoff = new Date(clock.now().getTime() - UNUSED_LEARNER_UPLOAD_MS);
  const stale = await db
    .select({ id: schema.media.id, schoolId: schema.media.schoolId })
    .from(schema.media)
    .where(
      and(
        eq(schema.media.category, "user_uploads"),
        eq(schema.media.status, "active"),
        sql`${schema.media.createdAt} < ${cutoff}`,
        notExists(
          db
            .select({ id: schema.mediaReferences.id })
            .from(schema.mediaReferences)
            .where(eq(schema.mediaReferences.mediaId, schema.media.id)),
        ),
        notExists(
          db
            .select({ id: schema.schoolAccounts.id })
            .from(schema.schoolAccounts)
            .where(
              and(
                eq(schema.schoolAccounts.schoolId, schema.media.schoolId),
                sql`${schema.schoolAccounts.avatar}->>'mediaId' = ${schema.media.publicId}`,
              ),
            ),
        ),
      ),
    )
    .limit(500);
  const bySchool = new Map<string, string[]>();
  for (const row of stale) {
    bySchool.set(row.schoolId, [...(bySchool.get(row.schoolId) ?? []), row.id]);
  }
  for (const [schoolId, mediaIds] of bySchool) {
    await deleteUnreferencedMedia(
      db,
      client,
      { schoolId, mediaIds, actorId: "system:storage", requestId: "unused_learner_uploads" },
      clock,
    );
  }
  return stale.length;
}
