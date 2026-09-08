import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  type Clock,
  uuidv7,
} from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";
const COURSE_COLLECTION = "courses";
const LESSON_COLLECTION = "lessons";

type JsonRecord = Record<string, unknown>;

export type ProductImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  rejected: number;
  sectionsImported: number;
  lessonsImported: number;
};

export type ProductImportRejection = {
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_legacy_id"
    | "invalid_course_id"
    | "invalid_product_type"
    | "invalid_title"
    | "invalid_slug"
    | "invalid_description"
    | "invalid_privacy"
    | "invalid_timestamp"
    | "invalid_groups"
    | "invalid_group"
    | "duplicate_group_id"
    | "invalid_group_lesson_order"
    | "invalid_drip"
    | "drip_precision_loss"
    | "drip_email_requires_sendlit"
    | "creator_not_found"
    | "school_mapping_missing"
    | "product_conflict"
    | "duplicate_source_id"
    | "mapping_target_missing"
    | "invalid_lessons"
    | "missing_lesson"
    | "lesson_course_mismatch"
    | "duplicate_lesson_id"
    | "invalid_lesson"
    | "invalid_lesson_type"
    | "invalid_lesson_content"
    | "lesson_group_missing"
    | "media_requires_medialit";
  details: Record<string, string | number | boolean | null>;
};

export type ProductImportResult = {
  runId: string;
  sourceSystem: string;
  mode: "dry_run" | "apply";
  status: "succeeded";
  counts: ProductImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: ProductImportRejection[];
};

export type LegacyProductExport = {
  courses: readonly unknown[];
  lessons: readonly unknown[];
};

type NormalizedDrip = {
  enabled: boolean;
  type: "relative-date" | "exact-date" | null;
  delaySeconds: number | null;
  at: Date | null;
};

type NormalizedGroup = {
  sourceId: string;
  title: string;
  position: number;
  drip: NormalizedDrip;
  lessonOrder: string[];
};

type NormalizedLesson = {
  sourceId: string;
  title: string;
  type: "text" | "video" | "audio" | "pdf" | "file" | "embed" | "quiz" | "scorm";
  content: Record<string, unknown>;
  downloadable: boolean;
  requiresEnrollment: boolean;
  status: "draft" | "published";
  groupId: string;
  position: number;
};

type NormalizedProduct = {
  sourceId: string;
  courseId: string;
  kind: "course" | "download";
  title: string;
  slug: string;
  description: string;
  privacy: "public" | "unlisted";
  leadMagnet: boolean;
  certificate: boolean;
  discussions: boolean;
  published: boolean;
  creatorId: string;
  domainId: string;
  createdAt: Date;
  updatedAt: Date;
  groups: NormalizedGroup[];
  lessons: NormalizedLesson[];
};

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function rejection(
  sourceId: string | null,
  code: ProductImportRejection["code"],
  details: ProductImportRejection["details"] = {},
): ProductImportRejection {
  return { sourceId, code, details };
}

function countRejection(
  counts: ProductImportCounts,
  rejectionByCode: Record<string, number>,
  item: ProductImportRejection,
) {
  counts.rejected += 1;
  rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
}

function persistableCounts(
  counts: ProductImportCounts,
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

function normalizeDrip(
  raw: unknown,
  sourceId: string,
):
  | { ok: true; value: NormalizedDrip }
  | { ok: false; error: ProductImportRejection } {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      value: { enabled: false, type: null, delaySeconds: null, at: null },
    };
  }
  const drip = asRecord(raw);
  if (!drip) {
    return { ok: false, error: rejection(sourceId, "invalid_drip") };
  }
  if (drip.status !== true) {
    return {
      ok: true,
      value: { enabled: false, type: null, delaySeconds: null, at: null },
    };
  }
  const type = stringValue(drip.type);
  const email = drip.email === undefined || drip.email === null
    ? null
    : asRecord(drip.email);
  if (drip.email !== undefined && drip.email !== null &&
      (!email || Object.keys(email).length > 0)) {
    return {
      ok: false,
      error: rejection(sourceId, "drip_email_requires_sendlit"),
    };
  }
  if (type === "relative-date") {
    if (typeof drip.delayInMillis !== "number" || !Number.isFinite(drip.delayInMillis)) {
      return { ok: false, error: rejection(sourceId, "invalid_drip") };
    }
    if (drip.delayInMillis < 0 || drip.delayInMillis % 1000 !== 0) {
      return { ok: false, error: rejection(sourceId, "drip_precision_loss") };
    }
    return {
      ok: true,
      value: {
        enabled: true,
        type,
        delaySeconds: drip.delayInMillis / 1000,
        at: null,
      },
    };
  }
  if (type === "exact-date") {
    const at = dateValue(drip.dateInUTC);
    if (!at) return { ok: false, error: rejection(sourceId, "invalid_drip") };
    return {
      ok: true,
      value: { enabled: true, type, delaySeconds: null, at },
    };
  }
  return { ok: false, error: rejection(sourceId, "invalid_drip") };
}

function normalizeGroups(
  raw: unknown,
  sourceId: string,
): { ok: true; value: NormalizedGroup[] } | { ok: false; error: ProductImportRejection } {
  if (raw === undefined || raw === null) return { ok: true, value: [] };
  if (!Array.isArray(raw)) {
    return { ok: false, error: rejection(sourceId, "invalid_groups") };
  }
  const seen = new Set<string>();
  const groups: Array<NormalizedGroup & { sourceIndex: number }> = [];
  for (const [sourceIndex, value] of raw.entries()) {
    const group = asRecord(value);
    if (!group) {
      return { ok: false, error: rejection(sourceId, "invalid_group") };
    }
    const groupId = idValue(group._id ?? group.id);
    const title = stringValue(group.name);
    const rank = group.rank;
    if (!groupId || !title || typeof rank !== "number" || !Number.isFinite(rank)) {
      return { ok: false, error: rejection(sourceId, "invalid_group") };
    }
    if (seen.has(groupId)) {
      return {
        ok: false,
        error: rejection(sourceId, "duplicate_group_id", { groupId }),
      };
    }
    seen.add(groupId);
    const lessonOrder = group.lessonsOrder;
    if (
      lessonOrder !== undefined &&
      (!Array.isArray(lessonOrder) ||
        lessonOrder.some((lessonId) => typeof lessonId !== "string" || !lessonId.trim()))
    ) {
      return { ok: false, error: rejection(sourceId, "invalid_group_lesson_order") };
    }
    const drip = normalizeDrip(group.drip, sourceId);
    if (!drip.ok) return drip;
    groups.push({
      sourceId: groupId,
      title,
      position: rank,
      drip: drip.value,
      lessonOrder: (lessonOrder as string[] | undefined)?.map((item) => item.trim()) ?? [],
      sourceIndex,
    });
  }
  groups.sort((left, right) => left.position - right.position || left.sourceIndex - right.sourceIndex);
  return {
    ok: true,
    value: groups.map(({ sourceIndex: _sourceIndex, position: _rank, ...group }, index) => ({
      ...group,
      position: index + 1,
    })),
  };
}

function normalizeProduct(
  raw: unknown,
  lessonsByCourse: Map<string, unknown[]>,
  now: Date,
):
  | { ok: true; value: NormalizedProduct }
  | { ok: false; error: ProductImportRejection } {
  const object = asRecord(raw);
  if (!object) return { ok: false, error: rejection(null, "invalid_record") };
  const sourceId = idValue(object._id ?? object.id ?? object.courseId);
  if (!sourceId) return { ok: false, error: rejection(null, "invalid_legacy_id") };
  const courseId = stringValue(object.courseId);
  if (!courseId) return { ok: false, error: rejection(sourceId, "invalid_course_id") };
  const sourceType = stringValue(object.type)?.toLowerCase();
  if (sourceType !== "course" && sourceType !== "download") {
    return {
      ok: false,
      error: rejection(sourceId, "invalid_product_type", { value: sourceType ?? null }),
    };
  }
  const title = stringValue(object.title);
  if (!title) return { ok: false, error: rejection(sourceId, "invalid_title") };
  const slug = stringValue(object.slug);
  if (!slug) return { ok: false, error: rejection(sourceId, "invalid_slug") };
  if (object.description !== undefined && typeof object.description !== "string") {
    return { ok: false, error: rejection(sourceId, "invalid_description") };
  }
  const privacy = stringValue(object.privacy)?.toLowerCase() || "unlisted";
  if (privacy !== "public" && privacy !== "unlisted") {
    return { ok: false, error: rejection(sourceId, "invalid_privacy") };
  }
  const creatorId = stringValue(object.creatorId);
  const domainId = idValue(object.domain);
  if (!creatorId || !domainId) {
    return { ok: false, error: rejection(sourceId, "invalid_record") };
  }
  const createdAt = object.createdAt === undefined ? now : dateValue(object.createdAt);
  const updatedAt = object.updatedAt === undefined ? now : dateValue(object.updatedAt);
  if (!createdAt || !updatedAt) {
    return { ok: false, error: rejection(sourceId, "invalid_timestamp") };
  }
  if (object.featuredImage) {
    return { ok: false, error: rejection(sourceId, "media_requires_medialit") };
  }
  const groupsResult = normalizeGroups(object.groups, sourceId);
  if (!groupsResult.ok) return groupsResult;
  const groups = groupsResult.value;
  const sourceLessonRefs = object.lessons;
  if (
    sourceLessonRefs !== undefined &&
    (!Array.isArray(sourceLessonRefs) ||
      sourceLessonRefs.some(
        (lessonId) => typeof lessonId !== "string" || !lessonId.trim(),
      ))
  ) {
    return { ok: false, error: rejection(sourceId, "invalid_lessons") };
  }
  const courseLessons = lessonsByCourse.get(courseId) ?? [];
  const lessonRecords = new Map<string, JsonRecord>();
  for (const value of courseLessons) {
    const lesson = asRecord(value);
    if (!lesson) return { ok: false, error: rejection(sourceId, "invalid_lesson") };
    const lessonId = stringValue(lesson.lessonId);
    if (!lessonId) return { ok: false, error: rejection(sourceId, "invalid_lesson") };
    if (lessonRecords.has(lessonId)) {
      return {
        ok: false,
        error: rejection(sourceId, "duplicate_lesson_id", { lessonId }),
      };
    }
    lessonRecords.set(lessonId, lesson);
  }
  const groupIds = new Set(groups.map((group) => group.sourceId));
  const normalizedLessons: Array<NormalizedLesson & { sourceIndex: number }> = [];
  for (const [sourceIndex, [lessonId, lesson]] of [...lessonRecords.entries()].entries()) {
    const lessonCourseId = stringValue(lesson.courseId);
    if (lessonCourseId !== courseId) {
      return {
        ok: false,
        error: rejection(sourceId, "lesson_course_mismatch", { lessonId }),
      };
    }
    const type = stringValue(lesson.type)?.toLowerCase();
    if (
      !["text", "video", "audio", "pdf", "file", "embed", "quiz", "scorm"].includes(
        type ?? "",
      )
    ) {
      return {
        ok: false,
        error: rejection(sourceId, "invalid_lesson_type", { lessonId, value: type ?? null }),
      };
    }
    const content =
      lesson.content === undefined || lesson.content === null ? {} : asRecord(lesson.content);
    if (!content) {
      return {
        ok: false,
        error: rejection(sourceId, "invalid_lesson_content", { lessonId }),
      };
    }
    if (lesson.media) {
      return { ok: false, error: rejection(sourceId, "media_requires_medialit", { lessonId }) };
    }
    const groupId = stringValue(lesson.groupId);
    if (!groupId || (groups.length > 0 && !groupIds.has(groupId))) {
      return { ok: false, error: rejection(sourceId, "lesson_group_missing", { lessonId }) };
    }
    normalizedLessons.push({
      sourceId: lessonId,
      title: stringValue(lesson.title) ?? "",
      type: type as NormalizedLesson["type"],
      content,
      downloadable: booleanOrDefault(lesson.downloadable, false),
      requiresEnrollment: booleanOrDefault(lesson.requiresEnrollment, true),
      status: booleanOrDefault(lesson.published, false) ? "published" : "draft",
      groupId,
      position: sourceIndex + 1,
      sourceIndex,
    });
  }
  if (normalizedLessons.some((lesson) => !lesson.title)) {
    return { ok: false, error: rejection(sourceId, "invalid_lesson") };
  }
  if (groups.length === 0) {
    if (normalizedLessons.length > 0) {
      return { ok: false, error: rejection(sourceId, "lesson_group_missing") };
    }
    groups.push({
      sourceId: `${courseId}:first-section`,
      title: "First section",
      position: 1,
      drip: { enabled: false, type: null, delaySeconds: null, at: null },
      lessonOrder: [],
    });
  }
  const refs = (sourceLessonRefs as string[] | undefined)?.map((item) => item.trim()) ?? [];
  for (const lessonId of refs) {
    if (!lessonRecords.has(lessonId)) {
      return {
        ok: false,
        error: rejection(sourceId, "missing_lesson", { lessonId }),
      };
    }
  }
  for (const group of groups) {
    for (const lessonId of group.lessonOrder) {
      if (!lessonRecords.has(lessonId)) {
        return {
          ok: false,
          error: rejection(sourceId, "missing_lesson", {
            lessonId,
            groupId: group.sourceId,
          }),
        };
      }
    }
  }
  const orderedLessons: NormalizedLesson[] = [];
  const added = new Set<string>();
  const addLesson = (lessonId: string) => {
    const lesson = normalizedLessons.find((item) => item.sourceId === lessonId);
    if (!lesson || added.has(lessonId)) return;
    added.add(lessonId);
    orderedLessons.push(lesson);
  };
  for (const group of groups) {
    for (const lessonId of group.lessonOrder) addLesson(lessonId);
    for (const lessonId of refs) {
      const lesson = normalizedLessons.find((item) => item.sourceId === lessonId);
      if (lesson?.groupId === group.sourceId) addLesson(lessonId);
    }
    for (const lesson of normalizedLessons) {
      if (lesson.groupId === group.sourceId) addLesson(lesson.sourceId);
    }
  }
  for (const lesson of normalizedLessons) addLesson(lesson.sourceId);
  return {
    ok: true,
    value: {
      sourceId,
      courseId,
      kind: sourceType,
      title,
      slug,
      description: typeof object.description === "string" ? object.description : "",
      privacy,
      leadMagnet: booleanOrDefault(object.leadMagnet, false),
      certificate: booleanOrDefault(object.certificate, false),
      discussions: booleanOrDefault(object.discussions, false),
      published: booleanOrDefault(object.published, false),
      creatorId,
      domainId,
      createdAt,
      updatedAt,
      groups,
      lessons: orderedLessons.map((lesson, position) => ({
        ...lesson,
        position: position + 1,
      })),
    },
  };
}

function lessonRecordsForCourse(
  records: readonly unknown[],
): Map<string, unknown[]> {
  const result = new Map<string, unknown[]>();
  for (const record of records) {
    const object = asRecord(record);
    const courseId = object ? stringValue(object.courseId) : null;
    if (!courseId) continue;
    result.set(courseId, [...(result.get(courseId) ?? []), record]);
  }
  return result;
}

export function readLegacyProductExport(path: string): LegacyProductExport {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return { courses: parsed, lessons: [] };
  const object = asRecord(parsed);
  if (!object || !Array.isArray(object.courses)) {
    throw new Error("product_export_must_be_array_or_object_with_courses_array");
  }
  if (object.lessons !== undefined && !Array.isArray(object.lessons)) {
    throw new Error("product_export_lessons_must_be_array");
  }
  return {
    courses: object.courses,
    lessons: object.lessons ?? [],
  };
}

export async function importLegacyProducts(
  db: AppDb,
  input: {
    courses: readonly unknown[];
    lessons?: readonly unknown[];
    clock: Clock;
    mode?: "dry_run" | "apply";
    sourceSystem?: string;
  },
): Promise<ProductImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const runId = uuidv7(input.clock);
  const counts: ProductImportCounts = {
    seen: input.courses.length,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    rejected: 0,
    sectionsImported: 0,
    lessonsImported: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: ProductImportRejection[] = [];
  const lessonsByCourse = lessonRecordsForCourse(input.lessons ?? []);
  const sourceIds = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: COURSE_COLLECTION,
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: ProductImportRejection) => {
    rejections.push(item);
    countRejection(counts, rejectionByCode, item);
  };

  try {
    for (const raw of input.courses) {
      const rawObject = asRecord(raw);
      const sourceId = idValue(rawObject?._id ?? rawObject?.id ?? rawObject?.courseId);
      if (sourceId && sourceIds.has(sourceId)) {
        addRejection(rejection(sourceId, "duplicate_source_id"));
        continue;
      }
      if (sourceId) sourceIds.add(sourceId);

      if (sourceId) {
        const mappings = await db
          .select()
          .from(schema.migrationMappings)
          .where(
            and(
              eq(schema.migrationMappings.sourceSystem, sourceSystem),
              eq(schema.migrationMappings.sourceCollection, COURSE_COLLECTION),
              eq(schema.migrationMappings.sourceId, sourceId),
              eq(schema.migrationMappings.targetTable, "products"),
            ),
          )
          .limit(1);
        if (mappings[0]) {
          const target = await db
            .select({ id: schema.products.id })
            .from(schema.products)
            .where(eq(schema.products.id, mappings[0].targetId))
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

      const normalized = normalizeProduct(raw, lessonsByCourse, now);
      if (!normalized.ok) {
        addRejection(normalized.error);
        continue;
      }
      const product = normalized.value;
      const schoolMapping = await db
        .select({
          schoolId: schema.migrationMappings.schoolId,
          targetId: schema.migrationMappings.targetId,
        })
        .from(schema.migrationMappings)
        .where(
          and(
            eq(schema.migrationMappings.sourceSystem, sourceSystem),
            eq(schema.migrationMappings.sourceCollection, "domains"),
            eq(schema.migrationMappings.sourceId, product.domainId),
            eq(schema.migrationMappings.targetTable, "schools"),
          ),
        )
        .limit(1);
      const schoolId = schoolMapping[0]?.schoolId;
      if (!schoolId) {
        addRejection(
          rejection(product.sourceId, "school_mapping_missing", {
            domainIdHash: digestForLog(product.domainId),
          }),
        );
        continue;
      }
      const creator = await db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.id, product.creatorId))
        .limit(1);
      if (!creator[0]) {
        addRejection(
          rejection(product.sourceId, "creator_not_found", {
            creatorIdHash: digestForLog(product.creatorId),
          }),
        );
        continue;
      }
      const existing = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.schoolId, schoolId),
            eq(schema.products.slug, product.slug),
          ),
        )
        .limit(1);
      const existingPublicId = await db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(
          and(
            eq(schema.products.schoolId, schoolId),
            eq(schema.products.publicId, product.courseId),
          ),
        )
        .limit(1);
      if (existing[0] || existingPublicId[0]) {
        addRejection(rejection(product.sourceId, "product_conflict", { slug: product.slug }));
        continue;
      }
      counts.ready += 1;
      if (mode === "dry_run") continue;

      await db.transaction(async (tx) => {
        const productId = uuidv7(input.clock);
        const productRow = {
          id: productId,
          publicId: product.courseId,
          schoolId,
          kind: product.kind,
          status: product.published ? ("published" as const) : ("draft" as const),
          slug: product.slug,
          title: product.title,
          description: product.description,
          privacy: product.privacy,
          leadMagnet: product.leadMagnet,
          certificate: product.certificate,
          discussions: product.kind === "course" ? product.discussions : false,
          createdBy: product.creatorId,
          publishedAt: product.published ? product.updatedAt : null,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        };
        await tx.insert(schema.products).values(productRow);
        for (const group of product.groups) {
          const sectionId = uuidv7(input.clock);
          await tx.insert(schema.productSections).values({
            id: sectionId,
            publicId: group.sourceId,
            schoolId,
            productId,
            title: group.title,
            position: group.position,
            dripEnabled: group.drip.enabled,
            dripType: group.drip.type,
            dripDelaySeconds: group.drip.delaySeconds,
            dripAt: group.drip.at,
            createdBy: product.creatorId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          });
          await tx.insert(schema.migrationMappings).values({
            id: uuidv7(input.clock),
            sourceSystem,
            sourceCollection: COURSE_COLLECTION,
            sourceId: `${product.sourceId}:group:${group.sourceId}`,
            targetTable: "product_sections",
            targetId: sectionId,
            schoolId,
            runId,
            createdAt: now,
          });
        }
        const sectionRows = await tx
          .select({ id: schema.productSections.id, publicId: schema.productSections.publicId })
          .from(schema.productSections)
          .where(eq(schema.productSections.productId, productId));
        const sectionIds = new Map(sectionRows.map((section) => [section.publicId, section.id]));
        for (const lesson of product.lessons) {
          const sectionId = sectionIds.get(lesson.groupId);
          if (!sectionId) {
            throw new Error("lesson_group_missing");
          }
          const lessonInternalId = uuidv7(input.clock);
          await tx.insert(schema.lessons).values({
            id: lessonInternalId,
            publicId: lesson.sourceId,
            schoolId,
            productId,
            sectionId,
            title: lesson.title,
            type: lesson.type,
            content: lesson.content,
            downloadable: lesson.downloadable,
            requiresEnrollment: lesson.requiresEnrollment,
            status: lesson.status,
            position: lesson.position,
            dripDelaySeconds: null,
            dripAt: null,
            publishedAt: lesson.status === "published" ? product.updatedAt : null,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
          });
          await tx.insert(schema.migrationMappings).values({
            id: uuidv7(input.clock),
            sourceSystem,
            sourceCollection: LESSON_COLLECTION,
            sourceId: lesson.sourceId,
            targetTable: "lessons",
            targetId: lessonInternalId,
            schoolId,
            runId,
            createdAt: now,
          });
          counts.lessonsImported += 1;
        }
        await tx.insert(schema.migrationMappings).values({
          id: uuidv7(input.clock),
          sourceSystem,
          sourceCollection: COURSE_COLLECTION,
          sourceId: product.sourceId,
          targetTable: "products",
          targetId: productId,
          schoolId,
          runId,
          createdAt: now,
        });
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(input.clock),
          schoolId,
          actorId: product.creatorId,
          action: "migration.product_imported",
          resourceType: "product",
          resourceId: product.courseId,
          requestId: `migration:${runId}`,
          createdAt: now,
        });
        counts.sectionsImported += product.groups.length;
      });
      counts.imported += 1;
    }
    if (rejections.length > 0) {
      await db.insert(schema.migrationRejections).values(
        rejections.map((item) => ({
          id: uuidv7(input.clock),
          runId,
          sourceSystem,
          sourceCollection: COURSE_COLLECTION,
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
