import { readFileSync } from "node:fs";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";
const SOURCE_COLLECTION = "users";
const TARGET_TABLE = "learners";

type JsonRecord = Record<string, unknown>;

export type LearnerImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  rejected: number;
};

export type LearnerImportRejection = {
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_learner_id"
    | "invalid_email"
    | "invalid_name"
    | "invalid_timestamps"
    | "school_mapping_missing"
    | "admin_record_requires_admin_import"
    | "duplicate_source_id"
    | "learner_conflict"
    | "mapping_target_missing";
  details: Record<string, string | number | boolean | null>;
};

export type LearnerImportResult = {
  runId: string;
  sourceSystem: string;
  mode: "dry_run" | "apply";
  status: "succeeded";
  counts: LearnerImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: LearnerImportRejection[];
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

function sourceIdFor(record: JsonRecord | null): string | null {
  if (!record) return null;
  return idValue(record.userId ?? record._id ?? record.id);
}

function rejection(
  sourceId: string | null,
  code: LearnerImportRejection["code"],
  details: LearnerImportRejection["details"] = {},
): LearnerImportRejection {
  return { sourceId, code, details };
}

function persistableCounts(
  counts: LearnerImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function hasAdminIdentity(record: JsonRecord): boolean {
  if (record.isAdmin === true || record.isOwner === true) return true;
  const role = stringValue(record.role)?.toLowerCase();
  if (role && ["admin", "owner", "instructor", "teacher"].includes(role)) return true;
  const permissions = JSON.stringify(record.permissions ?? "").toLowerCase();
  return permissions.includes("admin") || permissions.includes("manage_");
}

export function readLegacyLearnerExport(path: string): readonly unknown[] {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return parsed;
  const object = asRecord(parsed);
  if (!object || !Array.isArray(object.users ?? object.learners)) {
    throw new Error("learner_export_must_be_array_or_object_with_users_array");
  }
  return (object.users ?? object.learners) as readonly unknown[];
}

export async function importLegacyLearners(
  db: AppDb,
  input: {
    records: readonly unknown[];
    clock: Clock;
    mode?: "dry_run" | "apply";
    sourceSystem?: string;
  },
): Promise<LearnerImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const runId = uuidv7(input.clock);
  const counts: LearnerImportCounts = {
    seen: input.records.length,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    rejected: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: LearnerImportRejection[] = [];
  const seenSourceIds = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: SOURCE_COLLECTION,
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: LearnerImportRejection) => {
    rejections.push(item);
    counts.rejected += 1;
    rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
  };

  try {
    for (const raw of input.records) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record);
      if (!record) {
        addRejection(rejection(null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(null, "invalid_learner_id"));
        continue;
      }
      if (seenSourceIds.has(sourceId)) {
        addRejection(rejection(sourceId, "duplicate_source_id"));
        continue;
      }
      seenSourceIds.add(sourceId);

      const existingMapping = await db
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
      if (existingMapping[0]) {
        const target = await db
          .select({ id: schema.learners.id })
          .from(schema.learners)
          .where(eq(schema.learners.id, existingMapping[0].targetId))
          .limit(1);
        if (!target[0]) {
          addRejection(
            rejection(sourceId, "mapping_target_missing", {
              targetId: existingMapping[0].targetId,
            }),
          );
        } else {
          counts.alreadyMapped += 1;
        }
        continue;
      }

      if (hasAdminIdentity(record)) {
        addRejection(rejection(sourceId, "admin_record_requires_admin_import"));
        continue;
      }
      const domainId = idValue(record.domain ?? record.domainId);
      const schoolMapping = domainId
        ? await db
            .select({ schoolId: schema.migrationMappings.schoolId })
            .from(schema.migrationMappings)
            .where(
              and(
                eq(schema.migrationMappings.sourceSystem, sourceSystem),
                eq(schema.migrationMappings.sourceCollection, "domains"),
                eq(schema.migrationMappings.sourceId, domainId),
                eq(schema.migrationMappings.targetTable, "schools"),
              ),
            )
            .limit(1)
        : [];
      const schoolId = schoolMapping[0]?.schoolId;
      if (!schoolId) {
        addRejection(rejection(sourceId, "school_mapping_missing"));
        continue;
      }
      const email = stringValue(record.email);
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        addRejection(rejection(sourceId, "invalid_email"));
        continue;
      }
      const normalized = normalizedEmail(email);
      const name = stringValue(record.name ?? record.fullName) ?? normalized.split("@", 1)[0]!;
      if (!name || name.length > 200) {
        addRejection(rejection(sourceId, "invalid_name"));
        continue;
      }
      const createdAt = record.createdAt === undefined ? now : dateValue(record.createdAt);
      const updatedAt = record.updatedAt === undefined ? now : dateValue(record.updatedAt);
      if (!createdAt || !updatedAt) {
        addRejection(rejection(sourceId, "invalid_timestamps"));
        continue;
      }
      const conflict = await db
        .select({ id: schema.learners.id })
        .from(schema.learners)
        .where(and(eq(schema.learners.schoolId, schoolId), eq(schema.learners.email, normalized)))
        .limit(1);
      if (conflict[0]) {
        addRejection(rejection(sourceId, "learner_conflict", { email: normalized }));
        continue;
      }
      counts.ready += 1;
      if (mode === "dry_run") continue;

      const learnerId = uuidv7(input.clock);
      const deactivated =
        record.deleted === true ||
        ["deleted", "deactivated", "inactive"].includes(
          stringValue(record.status)?.toLowerCase() ?? "",
        );
      await db.insert(schema.learners).values({
        id: learnerId,
        publicId: sourceId,
        schoolId,
        email: normalized,
        name,
        status: deactivated ? "deactivated" : "active",
        createdAt,
        updatedAt,
      });
      await db.insert(schema.migrationMappings).values({
        id: uuidv7(input.clock),
        sourceSystem,
        sourceCollection: SOURCE_COLLECTION,
        sourceId,
        targetTable: TARGET_TABLE,
        targetId: learnerId,
        schoolId,
        runId,
        createdAt: now,
      });
      counts.imported += 1;
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
  };
}
