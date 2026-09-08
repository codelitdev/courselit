import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { type Clock, createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SECRET_BYTES = 32;

export function generateApiKeySecret(): string {
  return randomBytes(SECRET_BYTES).toString("base64url");
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

export function formatApiKey(publicId: string, secret: string): string {
  return `${publicId}.${secret}`;
}

export function parseApiKey(
  value: string,
): { publicId: string; secret: string } | null {
  const sep = value.indexOf(".");
  if (sep <= 0) return null;
  const publicId = value.slice(0, sep);
  const secret = value.slice(sep + 1);
  if (!publicId || secret.length < 43) return null;
  return { publicId, secret };
}

export async function createApiKeyRecord(input: {
  db: AppDb;
  schoolId: string;
  userId: string;
  permissions: readonly string[];
  pepper: string;
  clock: Clock;
  expiresAt?: Date;
  audit?: { requestId: string };
}): Promise<{ id: string; publicId: string; raw: string }> {
  const id = uuidv7(input.clock);
  const publicId = createPublicId("key", input.clock);
  const secret = generateApiKeySecret();
  const now = input.clock.now();
  await input.db.transaction(async (tx) => {
    await tx.insert(schema.apiKeys).values({
      id,
      publicId,
      schoolId: input.schoolId,
      userId: input.userId,
      digest: digestApiKeySecret(input.pepper, secret),
      permissions: input.permissions.join(","),
      ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      createdAt: now,
    });
    if (input.audit) {
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(input.clock),
        schoolId: input.schoolId,
        actorId: input.userId,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: publicId,
        requestId: input.audit.requestId,
        createdAt: now,
      });
    }
  });
  return { id, publicId, raw: formatApiKey(publicId, secret) };
}

export async function listApiKeyRecords(db: AppDb, schoolId: string) {
  return db
    .select({
      id: schema.apiKeys.id,
      publicId: schema.apiKeys.publicId,
      expiresAt: schema.apiKeys.expiresAt,
      revokedAt: schema.apiKeys.revokedAt,
      lastUsedAt: schema.apiKeys.lastUsedAt,
      createdAt: schema.apiKeys.createdAt,
    })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.schoolId, schoolId));
}

export async function revokeApiKey(
  db: AppDb,
  publicId: string,
  schoolId: string,
  clock: Clock,
  audit?: { actorId: string; requestId: string },
): Promise<boolean> {
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .update(schema.apiKeys)
      .set({ revokedAt: now })
      .where(
        and(
          eq(schema.apiKeys.publicId, publicId),
          eq(schema.apiKeys.schoolId, schoolId),
          isNull(schema.apiKeys.revokedAt),
        ),
      )
      .returning({ id: schema.apiKeys.id });
    if (rows.length > 0 && audit) {
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
