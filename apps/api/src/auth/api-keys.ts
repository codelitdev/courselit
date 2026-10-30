import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { and, count, desc, eq, gt, isNull, lt, ne, or } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

/**
 * Recognisable prefix so leaked keys are caught by secret scanners and are
 * obvious at a glance. The full key is `cl_live_<publicId>.<secret>`; the
 * `cl_live_<publicId>` part is not secret and is what the dashboard shows.
 */
export const API_KEY_PREFIX = "cl_live_";

/** 32 CSPRNG bytes = 256 bits, base64url (43 chars, no padding). */
const SECRET_BYTES = 32;
const SECRET_LENGTH = 43;
const API_KEY_PATTERN = /^cl_live_(key_[0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;

/** Upper bound on keys a school may hold at once (not revoked, not expired). */
export const MAX_ACTIVE_API_KEYS_PER_SCHOOL = 50;
/** Furthest allowed expiry for a new key. */
export const MAX_API_KEY_LIFETIME_MS = 2 * 366 * 24 * 60 * 60 * 1000;
/** `lastUsedAt` is operational metadata; only write it this often per key. */
export const API_KEY_LAST_USED_THROTTLE_MS = 5 * 60 * 1000;

export function generateApiKeySecret(): string {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  if (secret.length !== SECRET_LENGTH) throw new Error("api_key_secret_length");
  return secret;
}

export function digestApiKeySecret(pepper: string, secret: string): string {
  return createHmac("sha256", pepper).update(secret, "utf8").digest("hex");
}

export function apiKeyDigestMatches(
  pepper: string,
  secret: string,
  storedHex: string,
): boolean {
  const actual = Buffer.from(digestApiKeySecret(pepper, secret), "hex");
  const expected = Buffer.from(storedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** The non-secret, displayable part of a key. */
export function apiKeyDisplayPrefix(publicId: string): string {
  return `${API_KEY_PREFIX}${publicId}`;
}

export function formatApiKey(publicId: string, secret: string): string {
  return `${apiKeyDisplayPrefix(publicId)}.${secret}`;
}

/**
 * Parses `cl_live_<publicId>.<secret>`. Anything else (missing prefix, wrong
 * public id shape, short/odd secret) is `null`; callers map that to the same
 * generic `unauthenticated` error as an unknown or revoked key.
 */
export function parseApiKey(
  value: string,
): { publicId: string; secret: string } | null {
  if (typeof value !== "string" || value.length > 200) return null;
  const match = API_KEY_PATTERN.exec(value.trim());
  if (!match) return null;
  return { publicId: match[1]!, secret: match[2]! };
}

export function isApiKeyExpired(expiresAt: Date | null | undefined, now: Date) {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

function activeKeyCondition(schoolId: string, now: Date) {
  return and(
    eq(schema.apiKeys.schoolId, schoolId),
    isNull(schema.apiKeys.revokedAt),
    or(isNull(schema.apiKeys.expiresAt), gt(schema.apiKeys.expiresAt, now)),
  );
}

/**
 * Loads a non-revoked key together with its school and the school's current
 * owner. Keys belong to the school, not to whoever created them: requests made
 * with a key act on behalf of the school, represented by its owner's account
 * (so `created_by`-style user references stay valid), while the key's own
 * stored permissions bound what it can do. Returns `null` for unknown or
 * revoked keys and for deleted schools.
 */
export async function loadActiveApiKey(
  db: AppDb,
  by: { publicId: string } | { id: string },
) {
  const rows = await db
    .select({
      key: schema.apiKeys,
      school: schema.schools,
      ownerMembership: schema.memberships,
      ownerAccount: schema.schoolAccounts,
    })
    .from(schema.apiKeys)
    .innerJoin(schema.schools, eq(schema.schools.id, schema.apiKeys.schoolId))
    .innerJoin(
      schema.memberships,
      and(
        eq(schema.memberships.schoolId, schema.apiKeys.schoolId),
        eq(schema.memberships.isOwner, true),
      ),
    )
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.memberships.schoolAccountId),
    )
    .where(
      and(
        "publicId" in by
          ? eq(schema.apiKeys.publicId, by.publicId)
          : eq(schema.apiKeys.id, by.id),
        isNull(schema.apiKeys.revokedAt),
        ne(schema.schools.status, "deleted"),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function createApiKeyRecord(input: {
  db: AppDb;
  schoolId: string;
  userId: string;
  membershipId: string;
  schoolAccountId: string;
  name: string;
  permissions: readonly string[];
  pepper: string;
  clock: Clock;
  expiresAt?: Date;
  requestId: string;
}): Promise<
  | {
      ok: true;
      value: {
        id: string;
        publicId: string;
        raw: string;
        createdAt: Date;
      };
    }
  | { ok: false; error: PlatformError }
> {
  const id = uuidv7(input.clock);
  const publicId = createPublicId("key", input.clock);
  const secret = generateApiKeySecret();
  const now = input.clock.now();
  const inserted = await input.db.transaction(async (tx) => {
    const active = await tx
      .select({ total: count() })
      .from(schema.apiKeys)
      .where(activeKeyCondition(input.schoolId, now));
    if (Number(active[0]?.total ?? 0) >= MAX_ACTIVE_API_KEYS_PER_SCHOOL) {
      return false;
    }
    await tx.insert(schema.apiKeys).values({
      id,
      publicId,
      schoolId: input.schoolId,
      userId: input.userId,
      membershipId: input.membershipId,
      createdBySchoolAccountId: input.schoolAccountId,
      name: input.name,
      digest: digestApiKeySecret(input.pepper, secret),
      permissions: [...input.permissions],
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(input.clock),
      schoolId: input.schoolId,
      actorId: input.userId,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: publicId,
      requestId: input.requestId,
      createdAt: now,
    });
    return true;
  });
  if (!inserted) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: {
          reason: "api_key_limit_reached",
          limit: MAX_ACTIVE_API_KEYS_PER_SCHOOL,
        },
      }),
    };
  }
  return {
    ok: true,
    value: { id, publicId, raw: formatApiKey(publicId, secret), createdAt: now },
  };
}

/** Non-revoked keys for a school (expired keys included and flagged by the caller). */
export async function listApiKeyRecords(db: AppDb, schoolId: string) {
  return db
    .select({
      id: schema.apiKeys.id,
      publicId: schema.apiKeys.publicId,
      name: schema.apiKeys.name,
      permissions: schema.apiKeys.permissions,
      expiresAt: schema.apiKeys.expiresAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      createdAt: schema.apiKeys.createdAt,
      createdByName: schema.schoolAccounts.displayName,
      createdByEmail: schema.schoolAccounts.email,
    })
    .from(schema.apiKeys)
    .leftJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.apiKeys.createdBySchoolAccountId),
    )
    .where(and(eq(schema.apiKeys.schoolId, schoolId), isNull(schema.apiKeys.revokedAt)))
    .orderBy(desc(schema.apiKeys.createdAt));
}

export async function revokeApiKey(
  db: AppDb,
  publicId: string,
  schoolId: string,
  clock: Clock,
  audit: { actorId: string; requestId: string },
): Promise<boolean> {
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(schema.apiKeys)
      .set({ revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.apiKeys.publicId, publicId),
          eq(schema.apiKeys.schoolId, schoolId),
          isNull(schema.apiKeys.revokedAt),
        ),
      )
      .returning({ id: schema.apiKeys.id });
    if (rows.length > 0) {
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId,
        actorId: audit.actorId,
        action: "api_key.revoked",
        resourceType: "api_key",
        resourceId: publicId,
        requestId: audit.requestId,
        createdAt: now,
      });
    }
    return rows.length > 0;
  });
}

/**
 * Best-effort `lastUsedAt` bookkeeping. Skips the write when the stored value
 * is recent, and never lets a failure affect authentication.
 */
export function touchApiKeyLastUsed(input: {
  db: AppDb;
  keyId: string;
  lastUsedAt: Date | null;
  now: Date;
  onError?: (error: unknown) => void;
}): void {
  const threshold = new Date(input.now.getTime() - API_KEY_LAST_USED_THROTTLE_MS);
  if (input.lastUsedAt && input.lastUsedAt.getTime() > threshold.getTime()) return;
  try {
    void input.db
      .update(schema.apiKeys)
      .set({ lastUsedAt: input.now })
      .where(
        and(
          eq(schema.apiKeys.id, input.keyId),
          or(
            isNull(schema.apiKeys.lastUsedAt),
            lt(schema.apiKeys.lastUsedAt, threshold),
          ),
        ),
      )
      .then(() => undefined)
      .catch((error: unknown) => input.onError?.(error));
  } catch (error) {
    input.onError?.(error);
  }
}
