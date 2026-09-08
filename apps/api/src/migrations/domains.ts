import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  type Clock,
  createPublicId,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import { OWNER_PERMISSIONS, serializePermissions } from "../permissions.js";
import { SCHOOL_PUBLIC_ID_PREFIX } from "../public-id-prefixes.js";
import { normalizeCustomHostname } from "../school-host.js";
import type { AppDb } from "../types.js";

const SOURCE_COLLECTION = "domains";
const TARGET_TABLE = "schools";
const DEFAULT_SOURCE_SYSTEM = "courselit-mongo";

type JsonRecord = Record<string, unknown>;

export type DomainImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  skippedDeleted: number;
  rejected: number;
};

export type DomainImportRejection = {
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_legacy_id"
    | "invalid_name"
    | "invalid_email"
    | "invalid_currency"
    | "invalid_custom_domain"
    | "duplicate_source_id"
    | "duplicate_host"
    | "host_taken"
    | "owner_not_found"
    | "owner_ambiguous"
    | "mapping_target_missing"
    | "skipped_deleted";
  details: Record<string, string | number | boolean | null>;
};

export type DomainImportResult = {
  runId: string;
  sourceSystem: string;
  mode: "dry_run" | "apply";
  status: "succeeded";
  counts: DomainImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: DomainImportRejection[];
  verificationChallenges: Array<{
    sourceId: string;
    hostname: string;
    name: string;
    value: string;
  }>;
};

type NormalizedDomain = {
  sourceId: string;
  name: string;
  email: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  customDomainVerifiedAt: Date | null;
  deleted: boolean;
  locale: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function idValue(value: unknown): string | null {
  const object = asRecord(value);
  if (object && typeof object.$oid === "string") return object.$oid.trim();
  if (typeof value === "string") return value.trim();
  return null;
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const object = asRecord(value);
  if (object?.$date !== undefined) return dateValue(object.$date);
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSubdomain(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized) &&
    normalized.length >= 3 &&
    normalized.length <= 63
    ? normalized
    : null;
}

function stringOrDefault(value: unknown, fallback: string): string {
  const string = stringValue(value);
  return string && string.length > 0 ? string : fallback;
}

function rejection(
  sourceId: string | null,
  code: DomainImportRejection["code"],
  details: DomainImportRejection["details"] = {},
): DomainImportRejection {
  return { sourceId, code, details };
}

function normalizeDomain(
  raw: unknown,
  now: Date,
): { ok: true; value: NormalizedDomain } | { ok: false; error: DomainImportRejection } {
  const object = asRecord(raw);
  if (!object) return { ok: false, error: rejection(null, "invalid_record") };
  const sourceId = idValue(object._id ?? object.id);
  if (!sourceId) {
    return { ok: false, error: rejection(null, "invalid_legacy_id") };
  }
  const name = stringValue(object.name);
  if (!name || !normalizeSubdomain(name)) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_name", { value: name }),
    };
  }
  const email = stringValue(object.email);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_email", { value: email }),
    };
  }
  const currency = stringOrDefault(object.currency, "USD").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_currency", { value: currency }),
    };
  }
  const customDomainValue = stringValue(object.customDomain);
  const customDomain = customDomainValue
    ? normalizeCustomHostname(customDomainValue)
    : null;
  if (customDomainValue && !customDomain) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_custom_domain", {
        value: customDomainValue,
      }),
    };
  }
  const createdAt = object.createdAt === undefined ? now : dateValue(object.createdAt);
  const updatedAt = object.updatedAt === undefined ? now : dateValue(object.updatedAt);
  if (!createdAt || !updatedAt) {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_record", {
        reason: "invalid_timestamp",
      }),
    };
  }
  const verifiedAt = object.customDomainVerifiedAt
    ? dateValue(object.customDomainVerifiedAt)
    : null;
  return {
    ok: true,
    value: {
      sourceId,
      name: normalizeSubdomain(name)!,
      email: normalizeEmail(email),
      customDomain,
      customDomainVerified: object.customDomainVerified === true,
      customDomainVerifiedAt: verifiedAt,
      deleted: object.deleted === true,
      locale: stringOrDefault(object.locale, "en"),
      currency,
      createdAt,
      updatedAt,
    },
  };
}

function countRejection(
  counts: DomainImportCounts,
  rejectionByCode: Record<string, number>,
  item: DomainImportRejection,
) {
  counts.rejected += 1;
  rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
}

function persistableCounts(
  counts: DomainImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

function digestForLog(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

export async function importLegacyDomains(
  db: AppDb,
  input: {
    records: readonly unknown[];
    clock: Clock;
    mode?: "dry_run" | "apply";
    sourceSystem?: string;
  },
): Promise<DomainImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? DEFAULT_SOURCE_SYSTEM;
  const runId = uuidv7(input.clock);
  const counts: DomainImportCounts = {
    seen: input.records.length,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    skippedDeleted: 0,
    rejected: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: DomainImportRejection[] = [];
  const verificationChallenges: DomainImportResult["verificationChallenges"] = [];

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: SOURCE_COLLECTION,
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const users = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user);
  const usersByEmail = new Map<string, string[]>();
  for (const user of users) {
    const key = normalizeEmail(user.email);
    usersByEmail.set(key, [...(usersByEmail.get(key) ?? []), user.id]);
  }
  const existingSchools = await db
    .select({ subdomain: schema.schools.subdomain })
    .from(schema.schools);
  const existingHosts = await db
    .select({ hostname: schema.schoolHosts.hostname })
    .from(schema.schoolHosts);
  const persistedHostnames = new Set([
    ...existingSchools.map((row) => row.subdomain.toLowerCase()),
    ...existingHosts.map((row) => row.hostname.toLowerCase()),
  ]);
  const claimedHosts = new Set([
    ...persistedHostnames,
  ]);
  const seenSourceIds = new Set<string>();

  const addRejection = (item: DomainImportRejection) => {
    rejections.push(item);
    if (item.code !== "skipped_deleted") {
      countRejection(counts, rejectionByCode, item);
    } else {
      rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
    }
  };

  try {
    for (const raw of input.records) {
      const sourceId = idValue(asRecord(raw)?._id ?? asRecord(raw)?.id);
      if (sourceId && seenSourceIds.has(sourceId)) {
        addRejection(rejection(sourceId, "duplicate_source_id"));
        continue;
      }
      if (sourceId) seenSourceIds.add(sourceId);

      if (sourceId) {
        const mappings = await db
          .select()
          .from(schema.migrationMappings)
          .where(
            and(
              eq(schema.migrationMappings.sourceSystem, sourceSystem),
              eq(schema.migrationMappings.sourceCollection, SOURCE_COLLECTION),
              eq(schema.migrationMappings.sourceId, sourceId),
              eq(schema.migrationMappings.targetTable, TARGET_TABLE),
            ),
          )
          .limit(1);
        if (mappings[0]) {
          const target = await db
            .select({ id: schema.schools.id })
            .from(schema.schools)
            .where(eq(schema.schools.id, mappings[0].targetId))
            .limit(1);
          if (!target[0]) {
            addRejection(
              rejection(sourceId, "mapping_target_missing", {
                targetId: mappings[0].targetId,
              }),
            );
          } else {
            counts.alreadyMapped += 1;
          }
          continue;
        }
      }

      const normalized = normalizeDomain(raw, now);
      if (!normalized.ok) {
        addRejection(normalized.error);
        continue;
      }
      const domain = normalized.value;
      if (domain.deleted) {
        counts.skippedDeleted += 1;
        addRejection(
          rejection(domain.sourceId, "skipped_deleted", { disposition: "archive" }),
        );
        continue;
      }

      const ownerIds = usersByEmail.get(domain.email) ?? [];
      if (ownerIds.length === 0) {
        addRejection(
          rejection(domain.sourceId, "owner_not_found", {
            emailHash: digestForLog(domain.email),
          }),
        );
        continue;
      }
      if (ownerIds.length > 1) {
        addRejection(
          rejection(domain.sourceId, "owner_ambiguous", {
            emailHash: digestForLog(domain.email),
            matches: ownerIds.length,
          }),
        );
        continue;
      }

      const hosts = [domain.name, ...(domain.customDomain ? [domain.customDomain] : [])];
      const duplicateHost = hosts.find((host) => claimedHosts.has(host));
      if (duplicateHost) {
        addRejection(
          rejection(domain.sourceId, persistedHostnames.has(duplicateHost) ? "host_taken" : "duplicate_host", {
            hostname: duplicateHost,
          }),
        );
        continue;
      }
      for (const host of hosts) claimedHosts.add(host);
      counts.ready += 1;
      if (mode === "dry_run") continue;

      const ownerId = ownerIds[0]!;
      const customVerification =
        domain.customDomain && !domain.customDomainVerified
          ? {
              value: randomBytes(32).toString("base64url"),
              name: `_courselit-verification.${domain.customDomain}`,
            }
          : null;
      await db.transaction(async (tx) => {
        const schoolId = uuidv7(input.clock);
        const publicId = createPublicId(SCHOOL_PUBLIC_ID_PREFIX, input.clock);
        await tx.insert(schema.schools).values({
          id: schoolId,
          publicId,
          name: domain.name,
          subdomain: domain.name,
          status: "active",
          locale: domain.locale,
          currency: domain.currency,
          createdAt: domain.createdAt,
          updatedAt: domain.updatedAt,
        });
        await tx.insert(schema.schoolHosts).values([
          {
            id: uuidv7(input.clock),
            schoolId,
            hostname: domain.name,
            kind: "subdomain",
            verificationStatus: "verified",
            verifiedAt: domain.createdAt,
            isPrimary: true,
            createdAt: domain.createdAt,
            updatedAt: domain.updatedAt,
          },
          ...(domain.customDomain
            ? [
                {
                  id: uuidv7(input.clock),
                  schoolId,
                  hostname: domain.customDomain,
                  kind: "custom" as const,
                  verificationStatus: domain.customDomainVerified
                    ? ("verified" as const)
                    : ("unverified" as const),
                  verificationTokenDigest: customVerification
                    ? digestForToken(customVerification.value)
                    : null,
                  verifiedAt: domain.customDomainVerified
                    ? domain.customDomainVerifiedAt ?? domain.updatedAt
                    : null,
                  isPrimary: false,
                  createdAt: domain.createdAt,
                  updatedAt: domain.updatedAt,
                },
              ]
            : []),
        ]);
        await tx.insert(schema.memberships).values({
          id: uuidv7(input.clock),
          schoolId,
          userId: ownerId,
          role: "owner",
          isOwner: true,
          permissions: serializePermissions(OWNER_PERMISSIONS),
          createdAt: domain.createdAt,
        });
        await tx.insert(schema.migrationMappings).values({
          id: uuidv7(input.clock),
          sourceSystem,
          sourceCollection: SOURCE_COLLECTION,
          sourceId: domain.sourceId,
          targetTable: TARGET_TABLE,
          targetId: schoolId,
          schoolId,
          runId,
          createdAt: now,
        });
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(input.clock),
          schoolId,
          actorId: ownerId,
          action: "migration.school_imported",
          resourceType: "school",
          resourceId: publicId,
          requestId: `migration:${runId}`,
          createdAt: now,
        });
      });
      counts.imported += 1;
      if (customVerification && domain.customDomain) {
        verificationChallenges.push({
          sourceId: domain.sourceId,
          hostname: domain.customDomain,
          name: customVerification.name,
          value: customVerification.value,
        });
      }
    }
    if (rejections.length > 0) {
      await db.insert(schema.migrationRejections).values(
        rejections.map((item) => ({
          id: uuidv7(input.clock),
          runId,
          sourceSystem,
          sourceCollection: SOURCE_COLLECTION,
          sourceId: item.sourceId,
          code: item.code,
          details: item.details,
          createdAt: now,
        })),
      );
    }
    await db
      .update(schema.migrationRuns)
      .set({
        status: "succeeded",
        counts: persistableCounts(counts, rejectionByCode),
        completedAt: input.clock.now(),
      })
      .where(eq(schema.migrationRuns.id, runId));
  } catch (error) {
    await db
      .update(schema.migrationRuns)
      .set({
        status: "failed",
        counts: persistableCounts(counts, rejectionByCode),
        errorCode: error instanceof Error ? error.name : "unknown_error",
        completedAt: input.clock.now(),
      })
      .where(eq(schema.migrationRuns.id, runId));
    throw error;
  }

  return {
    runId,
    sourceSystem,
    mode,
    status: "succeeded",
    counts,
    rejectionByCode,
    rejections,
    verificationChallenges,
  };
}

function digestForToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function readLegacyDomainExport(path: string): readonly unknown[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return parsed;
  const object = asRecord(parsed);
  if (object && Array.isArray(object.domains)) return object.domains;
  throw new Error("domain_export_must_be_array_or_object_with_domains_array");
}
