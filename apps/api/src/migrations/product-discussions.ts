import { readFileSync } from "node:fs";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import { validateDiscussionContent } from "../product-discussions.js";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";

const COLLECTIONS = {
  comments: "productDiscussionComments",
  replies: "productDiscussionReplies",
  likes: "productDiscussionLikes",
  summaries: "productDiscussionSummaries",
  subscribers: "productDiscussionSubscribers",
  reports: "productDiscussionReports",
} as const;

const TARGETS = {
  comments: "productDiscussionComments",
  replies: "productDiscussionReplies",
  likes: "productDiscussionLikes",
  summaries: "productDiscussionSummaries",
  subscribers: "productDiscussionSubscribers",
  reports: "productDiscussionReports",
} as const;

type JsonRecord = Record<string, unknown>;
type Mode = "dry_run" | "apply";
type EntityType = "lesson" | "product";
type ContentType = "comment" | "reply";
type Identity = { schoolAccountId: string | null };

export type LegacyProductDiscussionExport = {
  comments: readonly unknown[];
  replies: readonly unknown[];
  likes: readonly unknown[];
  summaries: readonly unknown[];
  subscribers: readonly unknown[];
  reports: readonly unknown[];
};

export type ProductDiscussionImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  rejected: number;
  commentsImported: number;
  repliesImported: number;
  likesImported: number;
  summariesImported: number;
  subscribersImported: number;
  reportsImported: number;
};

export type ProductDiscussionImportRejection = {
  sourceCollection: string;
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_id"
    | "duplicate_source_id"
    | "product_mapping_missing"
    | "lesson_mapping_missing"
    | "target_mapping_missing"
    | "target_school_mismatch"
    | "invalid_entity_type"
    | "invalid_content_type"
    | "invalid_content"
    | "invalid_identity"
    | "invalid_timestamps"
    | "invalid_count"
    | "invalid_status"
    | "comment_mapping_missing"
    | "reply_mapping_missing"
    | "content_mapping_missing"
    | "summary_mapping_missing"
    | "target_conflict";
  details: Record<string, string | number | boolean | null>;
};

export type ProductDiscussionImportResult = {
  runId: string;
  sourceSystem: string;
  mode: Mode;
  status: "succeeded";
  counts: ProductDiscussionImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: ProductDiscussionImportRejection[];
};

type Mapping = typeof schema.migrationMappings.$inferSelect;
type DiscussionTarget = {
  schoolId: string;
  productId: string;
  entityType: EntityType;
  entityId: string;
  productSourceId: string;
  entitySourceId: string;
};
type NormalizedContent = {
  target: DiscussionTarget;
  sourceId: string;
  identity: Identity;
  content: string;
  likesCount: number;
  deletedAt: Date | null;
  deletedBy: string | null;
  deletedByRole: "author" | "moderator" | "system" | null;
  deleteReason: string | null;
  restoredAt: Date | null;
  restoredBy: string | null;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
};
type NormalizedReply = NormalizedContent & {
  commentSourceId: string;
  parentReplySourceId: string | null;
};
type NormalizedLike = {
  target: DiscussionTarget;
  sourceId: string;
  contentType: ContentType;
  contentSourceId: string;
  commentSourceId: string | null;
  identity: Identity;
  createdAt: Date;
};
type NormalizedSummary = {
  target: DiscussionTarget;
  sourceId: string;
  commentsCount: number;
  repliesCount: number;
  totalCount: number;
  activityCountIncludingDeleted: number;
  lastActivityAt: Date;
  lastCommentId: string | null;
  lastReplyId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type NormalizedSubscriber = {
  target: DiscussionTarget;
  sourceId: string;
  identity: Identity;
  subscription: boolean;
  createdAt: Date;
  updatedAt: Date;
};
type NormalizedReport = {
  target: DiscussionTarget;
  sourceId: string;
  contentType: ContentType;
  contentSourceId: string;
  commentSourceId: string | null;
  identity: Identity;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
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

function valueFrom(record: JsonRecord, key: string): unknown {
  if (record[key] !== undefined) return record[key];
  const target = asRecord(record.target);
  return target?.[key];
}

function sourceIdFor(record: JsonRecord | null, ...keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = idValue(record[key]);
    if (value) return value;
  }
  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  const object = asRecord(value);
  if (object?.$date !== undefined) return dateValue(object.$date);
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function timestamps(
  record: JsonRecord,
  fallback: Date,
): { createdAt: Date; updatedAt: Date } | null {
  const createdAt = record.createdAt === undefined ? fallback : dateValue(record.createdAt);
  const updatedAt = record.updatedAt === undefined
    ? (createdAt ?? fallback)
    : dateValue(record.updatedAt);
  return createdAt && updatedAt ? { createdAt, updatedAt } : null;
}

function nonNegativeInteger(value: unknown, fallback = 0): number | null {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function rejection(
  sourceCollection: string,
  sourceId: string | null,
  code: ProductDiscussionImportRejection["code"],
  details: ProductDiscussionImportRejection["details"] = {},
): ProductDiscussionImportRejection {
  return { sourceCollection, sourceId, code, details };
}

function normalizeEntityType(value: unknown): EntityType | null {
  const type = stringValue(value)?.toLowerCase() ?? "lesson";
  return type === "lesson" || type === "product" ? type : null;
}

function normalizeContentType(value: unknown): ContentType | null {
  const type = stringValue(value)?.toLowerCase();
  return type === "comment" || type === "reply" ? type : null;
}

function normalizeStatus(value: unknown): "pending" | "accepted" | "rejected" | null {
  const status = stringValue(value)?.toLowerCase() ?? "pending";
  return status === "pending" || status === "accepted" || status === "rejected"
    ? status
    : null;
}

function normalizeDeletedByRole(value: unknown): "author" | "moderator" | "system" | null {
  const role = stringValue(value)?.toLowerCase();
  if (!role) return null;
  if (role === "author") return "author";
  if (role === "moderator" || role === "course_admin" || role === "admin") {
    return "moderator";
  }
  if (role === "system") return "system";
  return "system";
}

function emptyDoc(): string {
  return JSON.stringify({ type: "doc", content: [] });
}

function textDoc(value: string): unknown {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: value }] }],
  };
}

function normalizeContent(value: unknown, deleted: boolean): string | null {
  if (deleted) return emptyDoc();
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      candidate = textDoc(value as string);
    }
  }
  const document = validateDiscussionContent(candidate);
  return document ? JSON.stringify(document) : null;
}

async function findMapping(
  db: AppDb,
  sourceSystem: string,
  sourceCollections: string | readonly string[],
  sourceId: string,
  targetTable: string,
): Promise<Mapping | null> {
  const collections = Array.isArray(sourceCollections)
    ? sourceCollections
    : [sourceCollections];
  for (const sourceCollection of collections) {
    const rows = await db
      .select()
      .from(schema.migrationMappings)
      .where(
        and(
          eq(schema.migrationMappings.sourceSystem, sourceSystem),
          eq(schema.migrationMappings.sourceCollection, sourceCollection),
          eq(schema.migrationMappings.sourceId, sourceId),
          eq(schema.migrationMappings.targetTable, targetTable),
        ),
      )
      .limit(1);
    if (rows[0]) return rows[0];
  }
  return null;
}

async function resolveProduct(
  db: AppDb,
  sourceSystem: string,
  sourceId: string,
): Promise<{ id: string; schoolId: string } | null> {
  const mapping = await findMapping(db, sourceSystem, ["courses", "products"], sourceId, "products");
  if (!mapping) return null;
  const rows = await db
    .select({ id: schema.products.id, schoolId: schema.products.schoolId })
    .from(schema.products)
    .where(eq(schema.products.id, mapping.targetId))
    .limit(1);
  return rows[0] ?? null;
}

async function resolveLesson(
  db: AppDb,
  sourceSystem: string,
  sourceId: string,
  productId: string,
  schoolId: string,
): Promise<string | null> {
  const mapping = await findMapping(db, sourceSystem, "lessons", sourceId, "lessons");
  if (!mapping) return null;
  const rows = await db
    .select({ id: schema.lessons.id })
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.id, mapping.targetId),
        eq(schema.lessons.productId, productId),
        eq(schema.lessons.schoolId, schoolId),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}

async function resolveAdmin(
  db: AppDb,
  sourceSystem: string,
  sourceId: string | null,
  schoolId: string,
): Promise<string | null> {
  if (!sourceId) return null;
  const directMembership = await db
    .select({ schoolAccountId: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .innerJoin(
      schema.memberships,
      eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
    )
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        eq(schema.schoolAccounts.userId, sourceId),
      ),
    )
    .limit(1);
  if (directMembership[0]?.schoolAccountId) return directMembership[0].schoolAccountId;
  const mapping = await findMapping(db, sourceSystem, "users", sourceId, "user");
  if (!mapping) return null;
  const mapped = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, mapping.targetId))
    .limit(1);
  if (!mapped[0]) return null;
  const membership = await db
    .select({ schoolAccountId: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .innerJoin(
      schema.memberships,
      eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
    )
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, schoolId),
        eq(schema.schoolAccounts.userId, mapped[0].id),
      ),
    )
    .limit(1);
  return membership[0]?.schoolAccountId ?? null;
}

async function resolveLearner(
  db: AppDb,
  sourceSystem: string,
  sourceId: string | null,
  schoolId: string,
): Promise<string | null> {
  if (!sourceId) return null;
  if (isUuid(sourceId)) {
    const direct = await db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(and(eq(schema.schoolAccounts.id, sourceId), eq(schema.schoolAccounts.schoolId, schoolId)))
      .limit(1);
    if (direct[0]) return direct[0].id;
  }
  const mapping = (await findMapping(db, sourceSystem, "users", sourceId, "school_accounts"))
    ?? (await findMapping(db, sourceSystem, "users", sourceId, "learners"));
  if (!mapping) return null;
  const mapped = await db
    .select({ id: schema.schoolAccounts.id })
    .from(schema.schoolAccounts)
    .where(and(eq(schema.schoolAccounts.id, mapping.targetId), eq(schema.schoolAccounts.schoolId, schoolId)))
    .limit(1);
  return mapped[0]?.id ?? null;
}

async function resolveIdentity(
  db: AppDb,
  sourceSystem: string,
  record: JsonRecord,
  schoolId: string,
): Promise<Identity> {
  const sourceUserId = sourceIdFor(record, "userId", "authorId", "reporterId", "actorId");
  const kind = stringValue(record.userKind ?? record.authorKind ?? record.reporterKind)?.toLowerCase();
  if (kind === "admin" || record.isAdmin === true) {
    const adminAccountId = await resolveAdmin(db, sourceSystem, sourceUserId, schoolId);
    return { schoolAccountId: adminAccountId };
  }
  if (kind === "learner") {
    const learnerAccountId = await resolveLearner(db, sourceSystem, sourceUserId, schoolId);
    return { schoolAccountId: learnerAccountId };
  }
  const adminAccountId = await resolveAdmin(db, sourceSystem, sourceUserId, schoolId);
  if (adminAccountId) {
    return { schoolAccountId: adminAccountId };
  }
  const learnerAccountId = await resolveLearner(db, sourceSystem, sourceUserId, schoolId);
  return { schoolAccountId: learnerAccountId };
}

function hasIdentity(identity: Identity): boolean {
  return Boolean(identity.schoolAccountId);
}

function sourceTargetFields(record: JsonRecord) {
  const productSourceId = idValue(
    valueFrom(record, "productId") ??
      valueFrom(record, "courseId") ??
      valueFrom(record, "product") ??
      valueFrom(record, "course"),
  );
  const entitySourceId = idValue(
    valueFrom(record, "entityId") ?? valueFrom(record, "lessonId") ?? valueFrom(record, "lesson"),
  );
  return { productSourceId, entitySourceId };
}

function repliesInParentOrder(records: readonly unknown[]): readonly unknown[] {
  const indexed = records.map((raw, index) => {
    const record = asRecord(raw);
    return {
      raw,
      index,
      sourceId: sourceIdFor(record, "replyId", "_id", "id"),
      parentId: record
        ? idValue(valueFrom(record, "parentReplyId") ?? valueFrom(record, "parentReply"))
        : null,
    };
  });
  const depthById = new Map<string, number>();
  const byId = new Map(indexed.filter((item) => item.sourceId).map((item) => [item.sourceId!, item]));
  const visiting = new Set<string>();
  const depth = (sourceId: string | null): number => {
    if (!sourceId) return 0;
    const known = depthById.get(sourceId);
    if (known !== undefined) return known;
    if (visiting.has(sourceId)) return 0;
    visiting.add(sourceId);
    const parent = byId.get(sourceId)?.parentId ?? null;
    const value = 1 + depth(parent);
    visiting.delete(sourceId);
    depthById.set(sourceId, value);
    return value;
  };
  return [...indexed]
    .sort((left, right) => {
      const depthDifference = depth(left.sourceId) - depth(right.sourceId);
      return depthDifference || left.index - right.index;
    })
    .map((item) => item.raw);
}

async function resolveTarget(
  db: AppDb,
  sourceSystem: string,
  record: JsonRecord,
  requireEntity: boolean,
): Promise<
  | { ok: true; value: DiscussionTarget }
  | { ok: false; error: ProductDiscussionImportRejection["code"] }
> {
  const { productSourceId, entitySourceId } = sourceTargetFields(record);
  if (!productSourceId) return { ok: false, error: "product_mapping_missing" };
  const product = await resolveProduct(db, sourceSystem, productSourceId);
  if (!product) return { ok: false, error: "product_mapping_missing" };
  const entityType = normalizeEntityType(valueFrom(record, "entityType"));
  if (!entityType) return { ok: false, error: "invalid_entity_type" };
  if (requireEntity && !entitySourceId) return { ok: false, error: "lesson_mapping_missing" };
  if (!entitySourceId) {
    return {
      ok: true,
      value: {
        schoolId: product.schoolId,
        productId: product.id,
        entityType,
        entityId: product.id,
        productSourceId,
        entitySourceId: productSourceId,
      },
    };
  }
  if (entityType === "product") {
    if (entitySourceId !== productSourceId) {
      const entityProduct = await resolveProduct(db, sourceSystem, entitySourceId);
      if (!entityProduct || entityProduct.id !== product.id) {
        return { ok: false, error: "product_mapping_missing" };
      }
    }
    return {
      ok: true,
      value: {
        schoolId: product.schoolId,
        productId: product.id,
        entityType,
        entityId: product.id,
        productSourceId,
        entitySourceId,
      },
    };
  }
  const lessonId = await resolveLesson(
    db,
    sourceSystem,
    entitySourceId,
    product.id,
    product.schoolId,
  );
  if (!lessonId) return { ok: false, error: "lesson_mapping_missing" };
  return {
    ok: true,
    value: {
      schoolId: product.schoolId,
      productId: product.id,
      entityType,
      entityId: lessonId,
      productSourceId,
      entitySourceId,
    },
  };
}

function sourceDomainId(record: JsonRecord): string | null {
  return idValue(valueFrom(record, "domainId") ?? valueFrom(record, "domain"));
}

async function domainMatchesSchool(
  db: AppDb,
  sourceSystem: string,
  record: JsonRecord,
  schoolId: string,
): Promise<boolean> {
  const domainId = sourceDomainId(record);
  if (!domainId) return true;
  const mapping = await findMapping(db, sourceSystem, "domains", domainId, "schools");
  return Boolean(mapping?.schoolId === schoolId);
}

async function existingMapping(
  db: AppDb,
  sourceSystem: string,
  sourceCollection: string,
  sourceId: string,
  targetTable: string,
): Promise<Mapping | null> {
  return findMapping(db, sourceSystem, sourceCollection, sourceId, targetTable);
}

async function targetExists(
  db: AppDb,
  targetTable: string,
  targetId: string,
): Promise<boolean> {
  switch (targetTable) {
    case TARGETS.comments:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionComments.id })
          .from(schema.productDiscussionComments)
          .where(eq(schema.productDiscussionComments.id, targetId))
          .limit(1))[0],
      );
    case TARGETS.replies:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionReplies.id })
          .from(schema.productDiscussionReplies)
          .where(eq(schema.productDiscussionReplies.id, targetId))
          .limit(1))[0],
      );
    case TARGETS.likes:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionLikes.id })
          .from(schema.productDiscussionLikes)
          .where(eq(schema.productDiscussionLikes.id, targetId))
          .limit(1))[0],
      );
    case TARGETS.summaries:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionSummaries.id })
          .from(schema.productDiscussionSummaries)
          .where(eq(schema.productDiscussionSummaries.id, targetId))
          .limit(1))[0],
      );
    case TARGETS.subscribers:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionSubscribers.id })
          .from(schema.productDiscussionSubscribers)
          .where(eq(schema.productDiscussionSubscribers.id, targetId))
          .limit(1))[0],
      );
    case TARGETS.reports:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionReports.id })
          .from(schema.productDiscussionReports)
          .where(eq(schema.productDiscussionReports.id, targetId))
          .limit(1))[0],
      );
    default:
      return false;
  }
}

async function targetPublicIdExists(
  db: AppDb,
  targetTable: string,
  publicId: string,
): Promise<boolean> {
  switch (targetTable) {
    case TARGETS.comments:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionComments.id })
          .from(schema.productDiscussionComments)
          .where(eq(schema.productDiscussionComments.publicId, publicId))
          .limit(1))[0],
      );
    case TARGETS.replies:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionReplies.id })
          .from(schema.productDiscussionReplies)
          .where(eq(schema.productDiscussionReplies.publicId, publicId))
          .limit(1))[0],
      );
    case TARGETS.likes:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionLikes.id })
          .from(schema.productDiscussionLikes)
          .where(eq(schema.productDiscussionLikes.publicId, publicId))
          .limit(1))[0],
      );
    case TARGETS.subscribers:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionSubscribers.id })
          .from(schema.productDiscussionSubscribers)
          .where(eq(schema.productDiscussionSubscribers.publicId, publicId))
          .limit(1))[0],
      );
    case TARGETS.reports:
      return Boolean(
        (await db
          .select({ id: schema.productDiscussionReports.id })
          .from(schema.productDiscussionReports)
          .where(eq(schema.productDiscussionReports.publicId, publicId))
          .limit(1))[0],
      );
    default:
      return false;
  }
}

async function summaryTargetExists(
  db: AppDb,
  target: DiscussionTarget,
): Promise<boolean> {
  return Boolean(
    (await db
      .select({ id: schema.productDiscussionSummaries.id })
      .from(schema.productDiscussionSummaries)
      .where(
        and(
          eq(schema.productDiscussionSummaries.schoolId, target.schoolId),
          eq(schema.productDiscussionSummaries.productId, target.productId),
          eq(schema.productDiscussionSummaries.entityType, target.entityType),
          eq(schema.productDiscussionSummaries.entityId, target.entityId),
        ),
      )
      .limit(1))[0],
  );
}

async function addMapping(
  db: AppDb,
  input: {
    clock: Clock;
    runId: string;
    sourceSystem: string;
    sourceCollection: string;
    sourceId: string;
    targetTable: string;
    targetId: string;
    schoolId: string;
  },
) {
  await db.insert(schema.migrationMappings).values({
    id: uuidv7(input.clock),
    sourceSystem: input.sourceSystem,
    sourceCollection: input.sourceCollection,
    sourceId: input.sourceId,
    targetTable: input.targetTable,
    targetId: input.targetId,
    schoolId: input.schoolId,
    runId: input.runId,
    createdAt: input.clock.now(),
  });
}

function persistableCounts(
  counts: ProductDiscussionImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

export function readLegacyProductDiscussionExport(path: string): LegacyProductDiscussionExport {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) return {
    comments: parsed,
    replies: [],
    likes: [],
    summaries: [],
    subscribers: [],
    reports: [],
  };
  const object = asRecord(parsed);
  if (!object) throw new Error("product_discussion_export_must_be_object");
  const keys = ["comments", "replies", "likes", "summaries", "subscribers", "reports"] as const;
  for (const key of keys) {
    if (object[key] !== undefined && !Array.isArray(object[key])) {
      throw new Error(`product_discussion_export_${key}_must_be_array`);
    }
  }
  return {
    comments: (object.comments ?? []) as readonly unknown[],
    replies: (object.replies ?? []) as readonly unknown[],
    likes: (object.likes ?? []) as readonly unknown[],
    summaries: (object.summaries ?? []) as readonly unknown[],
    subscribers: (object.subscribers ?? []) as readonly unknown[],
    reports: (object.reports ?? []) as readonly unknown[],
  };
}

export async function importLegacyProductDiscussions(
  db: AppDb,
  input: {
    exportData: LegacyProductDiscussionExport;
    clock: Clock;
    mode?: Mode;
    sourceSystem?: string;
  },
): Promise<ProductDiscussionImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const data = input.exportData;
  const counts: ProductDiscussionImportCounts = {
    seen: Object.values(data).reduce((total, records) => total + records.length, 0),
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    rejected: 0,
    commentsImported: 0,
    repliesImported: 0,
    likesImported: 0,
    summariesImported: 0,
    subscribersImported: 0,
    reportsImported: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: ProductDiscussionImportRejection[] = [];
  const runId = uuidv7(input.clock);
  const seen = new Set<string>();
  const plannedIds = new Map<string, string>();
  const validSourceTargetKeys = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: "product_discussions",
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: ProductDiscussionImportRejection) => {
    rejections.push(item);
    counts.rejected += 1;
    rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
  };

  const keyFor = (collection: string, sourceId: string) => `${collection}:${sourceId}`;

  const targetIdFor = async (
    collection: string,
    sourceId: string,
    targetTable: string,
  ): Promise<string | null> => {
    const planned = plannedIds.get(keyFor(collection, sourceId));
    if (planned) return planned;
    const mapping = await existingMapping(db, sourceSystem, collection, sourceId, targetTable);
    return mapping?.targetId ?? null;
  };

  const planTargetId = (collection: string, sourceId: string): string => {
    const key = keyFor(collection, sourceId);
    const existing = plannedIds.get(key);
    if (existing) return existing;
    const targetId = uuidv7(input.clock);
    plannedIds.set(key, targetId);
    return targetId;
  };

  const mappingWasApplied = async (
    collection: string,
    sourceId: string,
    targetTable: string,
  ): Promise<boolean> => {
    const mapping = await existingMapping(db, sourceSystem, collection, sourceId, targetTable);
    if (!mapping) return false;
    if (!(await targetExists(db, targetTable, mapping.targetId))) {
      addRejection(rejection(collection, sourceId, "target_mapping_missing", { targetId: mapping.targetId }));
      return true;
    }
    counts.alreadyMapped += 1;
    plannedIds.set(keyFor(collection, sourceId), mapping.targetId);
    return true;
  };

  const markReady = () => {
    counts.ready += 1;
    return mode === "apply";
  };

  const prepareTarget = async (
    collection: string,
    sourceId: string,
    record: JsonRecord,
    requireEntity: boolean,
  ): Promise<DiscussionTarget | null> => {
    const targetResult = await resolveTarget(db, sourceSystem, record, requireEntity);
    if (!targetResult.ok) {
      addRejection(rejection(collection, sourceId, targetResult.error));
      return null;
    }
    if (!(await domainMatchesSchool(db, sourceSystem, record, targetResult.value.schoolId))) {
      addRejection(rejection(collection, sourceId, "target_school_mismatch"));
      return null;
    }
    return targetResult.value;
  };

  const identityFor = async (
    collection: string,
    sourceId: string,
    record: JsonRecord,
    schoolId: string,
  ): Promise<Identity | null> => {
    const identity = await resolveIdentity(db, sourceSystem, record, schoolId);
    if (!hasIdentity(identity)) {
      addRejection(rejection(collection, sourceId, "invalid_identity"));
      return null;
    }
    return identity;
  };

  try {
    for (const raw of data.comments) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "commentId", "_id", "id");
      if (!record) {
        addRejection(rejection(COLLECTIONS.comments, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(COLLECTIONS.comments, null, "invalid_id"));
        continue;
      }
      const duplicateKey = keyFor(COLLECTIONS.comments, sourceId);
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.comments, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingWasApplied(COLLECTIONS.comments, sourceId, TARGETS.comments)) continue;
      if (await targetPublicIdExists(db, TARGETS.comments, sourceId)) {
        addRejection(rejection(COLLECTIONS.comments, sourceId, "target_conflict"));
        continue;
      }
      const target = await prepareTarget(COLLECTIONS.comments, sourceId, record, true);
      if (!target) continue;
      const identity = await identityFor(COLLECTIONS.comments, sourceId, record, target.schoolId);
      if (!identity) continue;
      const deleted = record.deleted === true ||
        (record.deletedAt !== undefined && record.deletedAt !== null);
      const content = normalizeContent(record.content, deleted);
      if (!content) {
        addRejection(rejection(COLLECTIONS.comments, sourceId, "invalid_content"));
        continue;
      }
      const dates = timestamps(record, now);
      const deletedAt = deleted
        ? (record.deletedAt === undefined ? dates?.updatedAt ?? null : dateValue(record.deletedAt))
        : null;
      if (!dates || (deleted && !deletedAt)) {
        addRejection(rejection(COLLECTIONS.comments, sourceId, "invalid_timestamps"));
        continue;
      }
      const likesCount = nonNegativeInteger(record.likesCount);
      if (likesCount === null) {
        addRejection(rejection(COLLECTIONS.comments, sourceId, "invalid_count"));
        continue;
      }
      validSourceTargetKeys.add(
        `${target.productSourceId}:${target.entityType}:${target.entitySourceId}`,
      );
      const targetId = planTargetId(COLLECTIONS.comments, sourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionComments).values({
        id: targetId,
        publicId: sourceId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        ...identity,
        content,
        likesCount,
        deletedAt,
        deletedBy: stringValue(record.deletedBy),
        deletedByRole: deleted ? normalizeDeletedByRole(record.deletedByRole) : null,
        deleteReason: stringValue(record.deleteReason),
        restoredAt: dateValue(record.restoredAt),
        restoredBy: stringValue(record.restoredBy),
        isEdited: booleanValue(record.isEdited, false),
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.comments,
        sourceId,
        targetTable: TARGETS.comments,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.commentsImported += 1;
    }

    for (const raw of repliesInParentOrder(data.replies)) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "replyId", "_id", "id");
      if (!record) {
        addRejection(rejection(COLLECTIONS.replies, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(COLLECTIONS.replies, null, "invalid_id"));
        continue;
      }
      const duplicateKey = keyFor(COLLECTIONS.replies, sourceId);
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingWasApplied(COLLECTIONS.replies, sourceId, TARGETS.replies)) continue;
      if (await targetPublicIdExists(db, TARGETS.replies, sourceId)) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "target_conflict"));
        continue;
      }
      const target = await prepareTarget(COLLECTIONS.replies, sourceId, record, true);
      if (!target) continue;
      const commentSourceId = idValue(
        valueFrom(record, "commentId") ?? valueFrom(record, "comment"),
      );
      if (!commentSourceId) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "comment_mapping_missing"));
        continue;
      }
      const commentTargetId = await targetIdFor(
        COLLECTIONS.comments,
        commentSourceId,
        TARGETS.comments,
      );
      if (!commentTargetId) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "comment_mapping_missing", { commentId: commentSourceId }));
        continue;
      }
      const identity = await identityFor(COLLECTIONS.replies, sourceId, record, target.schoolId);
      if (!identity) continue;
      const deleted = record.deleted === true ||
        (record.deletedAt !== undefined && record.deletedAt !== null);
      const content = normalizeContent(record.content, deleted);
      const dates = timestamps(record, now);
      const deletedAt = deleted
        ? (record.deletedAt === undefined ? dates?.updatedAt ?? null : dateValue(record.deletedAt))
        : null;
      if (!content) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "invalid_content"));
        continue;
      }
      if (!dates || (deleted && !deletedAt)) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "invalid_timestamps"));
        continue;
      }
      const likesCount = nonNegativeInteger(record.likesCount);
      if (likesCount === null) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "invalid_count"));
        continue;
      }
      const parentReplySourceId = idValue(
        valueFrom(record, "parentReplyId") ?? valueFrom(record, "parentReply"),
      );
      const parentReplyId = parentReplySourceId
        ? await targetIdFor(COLLECTIONS.replies, parentReplySourceId, TARGETS.replies)
        : null;
      if (parentReplySourceId && !parentReplyId) {
        addRejection(rejection(COLLECTIONS.replies, sourceId, "reply_mapping_missing", { parentReplyId: parentReplySourceId }));
        continue;
      }
      validSourceTargetKeys.add(
        `${target.productSourceId}:${target.entityType}:${target.entitySourceId}`,
      );
      const targetId = planTargetId(COLLECTIONS.replies, sourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionReplies).values({
        id: targetId,
        publicId: sourceId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        commentId: commentTargetId,
        parentReplyId,
        ...identity,
        content,
        likesCount,
        deletedAt,
        deletedBy: stringValue(record.deletedBy),
        deletedByRole: deleted ? normalizeDeletedByRole(record.deletedByRole) : null,
        deleteReason: stringValue(record.deleteReason),
        restoredAt: dateValue(record.restoredAt),
        restoredBy: stringValue(record.restoredBy),
        isEdited: booleanValue(record.isEdited, false),
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.replies,
        sourceId,
        targetTable: TARGETS.replies,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.repliesImported += 1;
    }

    for (const raw of data.likes) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "likeId", "_id", "id");
      if (!record) {
        addRejection(rejection(COLLECTIONS.likes, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(COLLECTIONS.likes, null, "invalid_id"));
        continue;
      }
      const duplicateKey = keyFor(COLLECTIONS.likes, sourceId);
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingWasApplied(COLLECTIONS.likes, sourceId, TARGETS.likes)) continue;
      if (await targetPublicIdExists(db, TARGETS.likes, sourceId)) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "target_conflict"));
        continue;
      }
      const target = await prepareTarget(COLLECTIONS.likes, sourceId, record, true);
      if (!target) continue;
      const contentType = normalizeContentType(valueFrom(record, "contentType") ?? valueFrom(record, "type"));
      const contentSourceId = idValue(valueFrom(record, "contentId"));
      if (!contentType) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "invalid_content_type"));
        continue;
      }
      if (!contentSourceId) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "content_mapping_missing"));
        continue;
      }
      const contentCollection = contentType === "comment" ? COLLECTIONS.comments : COLLECTIONS.replies;
      const contentTargetId = await targetIdFor(
        contentCollection,
        contentSourceId,
        contentType === "comment" ? TARGETS.comments : TARGETS.replies,
      );
      if (!contentTargetId) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "content_mapping_missing", { contentId: contentSourceId }));
        continue;
      }
      const commentSourceId = contentType === "reply"
        ? idValue(valueFrom(record, "commentId"))
        : null;
      const commentId = commentSourceId
        ? await targetIdFor(COLLECTIONS.comments, commentSourceId, TARGETS.comments)
        : null;
      if (contentType === "reply" && !commentId) {
        addRejection(rejection(COLLECTIONS.likes, sourceId, "comment_mapping_missing"));
        continue;
      }
      const identity = await identityFor(COLLECTIONS.likes, sourceId, record, target.schoolId);
      const dates = timestamps(record, now);
      if (!identity || !dates) {
        if (identity && !dates) addRejection(rejection(COLLECTIONS.likes, sourceId, "invalid_timestamps"));
        continue;
      }
      const targetId = planTargetId(COLLECTIONS.likes, sourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionLikes).values({
        id: targetId,
        publicId: sourceId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        contentType,
        contentId: contentTargetId,
        commentId,
        schoolAccountId: identity.schoolAccountId!,
        createdAt: dates.createdAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.likes,
        sourceId,
        targetTable: TARGETS.likes,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.likesImported += 1;
    }

    for (const raw of data.subscribers) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "subscriptionId", "subscriberId", "_id", "id");
      if (!record) {
        addRejection(rejection(COLLECTIONS.subscribers, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(COLLECTIONS.subscribers, null, "invalid_id"));
        continue;
      }
      const duplicateKey = keyFor(COLLECTIONS.subscribers, sourceId);
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.subscribers, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingWasApplied(COLLECTIONS.subscribers, sourceId, TARGETS.subscribers)) continue;
      if (await targetPublicIdExists(db, TARGETS.subscribers, sourceId)) {
        addRejection(rejection(COLLECTIONS.subscribers, sourceId, "target_conflict"));
        continue;
      }
      const target = await prepareTarget(COLLECTIONS.subscribers, sourceId, record, true);
      if (!target) continue;
      const identity = await identityFor(COLLECTIONS.subscribers, sourceId, record, target.schoolId);
      const dates = timestamps(record, now);
      if (!identity || !dates) {
        if (identity && !dates) addRejection(rejection(COLLECTIONS.subscribers, sourceId, "invalid_timestamps"));
        continue;
      }
      const targetId = planTargetId(COLLECTIONS.subscribers, sourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionSubscribers).values({
        id: targetId,
        publicId: sourceId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        schoolAccountId: identity.schoolAccountId!,
        subscription: booleanValue(record.subscription, true),
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.subscribers,
        sourceId,
        targetTable: TARGETS.subscribers,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.subscribersImported += 1;
    }

    for (const raw of data.reports) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "reportId", "_id", "id");
      if (!record) {
        addRejection(rejection(COLLECTIONS.reports, null, "invalid_record"));
        continue;
      }
      if (!sourceId) {
        addRejection(rejection(COLLECTIONS.reports, null, "invalid_id"));
        continue;
      }
      const duplicateKey = keyFor(COLLECTIONS.reports, sourceId);
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingWasApplied(COLLECTIONS.reports, sourceId, TARGETS.reports)) continue;
      if (await targetPublicIdExists(db, TARGETS.reports, sourceId)) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "target_conflict"));
        continue;
      }
      const target = await prepareTarget(COLLECTIONS.reports, sourceId, record, true);
      if (!target) continue;
      const contentType = normalizeContentType(valueFrom(record, "contentType") ?? valueFrom(record, "type"));
      const contentSourceId = idValue(valueFrom(record, "contentId"));
      if (!contentType) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "invalid_content_type"));
        continue;
      }
      if (!contentSourceId) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "content_mapping_missing"));
        continue;
      }
      const contentCollection = contentType === "comment" ? COLLECTIONS.comments : COLLECTIONS.replies;
      const contentTargetId = await targetIdFor(
        contentCollection,
        contentSourceId,
        contentType === "comment" ? TARGETS.comments : TARGETS.replies,
      );
      if (!contentTargetId) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "content_mapping_missing"));
        continue;
      }
      const commentSourceId = contentType === "reply" ? idValue(valueFrom(record, "commentId")) : null;
      const commentId = commentSourceId
        ? await targetIdFor(COLLECTIONS.comments, commentSourceId, TARGETS.comments)
        : null;
      if (contentType === "reply" && !commentId) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "comment_mapping_missing"));
        continue;
      }
      const identity = await identityFor(COLLECTIONS.reports, sourceId, record, target.schoolId);
      const status = normalizeStatus(record.status);
      const dates = timestamps(record, now);
      if (!status) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "invalid_status"));
        continue;
      }
      if (!identity || !dates) {
        if (identity && !dates) addRejection(rejection(COLLECTIONS.reports, sourceId, "invalid_timestamps"));
        continue;
      }
      const targetId = planTargetId(COLLECTIONS.reports, sourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionReports).values({
        id: targetId,
        publicId: sourceId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        contentType,
        contentId: contentTargetId,
        commentId: commentId ?? undefined,
        schoolAccountId: identity.schoolAccountId!,
        reason: stringValue(record.reason) ?? "Legacy report",
        status,
        rejectionReason: stringValue(record.rejectionReason),
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.reports,
        sourceId,
        targetTable: TARGETS.reports,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.reportsImported += 1;
    }

    // Summaries are imported last so all public IDs are available. When the
    // legacy export did not include a summary row, runtime queries still need
    // one; those rows are synthesized from the migrated comments and replies.
    const summaries = [...data.summaries];
    const summaryKeys = new Set<string>();
    for (const raw of summaries) {
      const record = asRecord(raw);
      const targetFields = record ? sourceTargetFields(record) : { productSourceId: null, entitySourceId: null };
      const entityType = record ? normalizeEntityType(valueFrom(record, "entityType")) : null;
      if (targetFields.productSourceId && targetFields.entitySourceId && entityType) {
        summaryKeys.add(`${targetFields.productSourceId}:${entityType}:${targetFields.entitySourceId}`);
      }
    }
    for (const raw of data.comments) {
      const record = asRecord(raw);
      if (!record) continue;
      const fields = sourceTargetFields(record);
      const entityType = normalizeEntityType(valueFrom(record, "entityType"));
      if (fields.productSourceId && fields.entitySourceId && entityType) {
        const key = `${fields.productSourceId}:${entityType}:${fields.entitySourceId}`;
        if (!summaryKeys.has(key) && validSourceTargetKeys.has(key)) {
          summaries.push({
            summaryId: `derived:${key}`,
            productId: fields.productSourceId,
            entityId: fields.entitySourceId,
            entityType,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastActivityAt: record.createdAt,
          });
          summaryKeys.add(key);
        }
      }
    }
    for (const raw of data.replies) {
      const record = asRecord(raw);
      if (!record) continue;
      const fields = sourceTargetFields(record);
      const entityType = normalizeEntityType(valueFrom(record, "entityType"));
      if (fields.productSourceId && fields.entitySourceId && entityType) {
        const key = `${fields.productSourceId}:${entityType}:${fields.entitySourceId}`;
        if (!summaryKeys.has(key) && validSourceTargetKeys.has(key)) {
          summaries.push({
            summaryId: `derived:${key}`,
            productId: fields.productSourceId,
            entityId: fields.entitySourceId,
            entityType,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            lastActivityAt: record.createdAt,
          });
          summaryKeys.add(key);
        }
      }
    }

    for (const raw of summaries) {
      const record = asRecord(raw);
      const fields = record ? sourceTargetFields(record) : { productSourceId: null, entitySourceId: null };
      const targetSourceId = sourceIdFor(record, "summaryId", "_id", "id") ??
        (fields.productSourceId && fields.entitySourceId
          ? `derived:${fields.productSourceId}:${normalizeEntityType(record?.entityType) ?? "lesson"}:${fields.entitySourceId}`
          : null);
      if (!record) {
        addRejection(rejection(COLLECTIONS.summaries, null, "invalid_record"));
        continue;
      }
      if (!targetSourceId) {
        addRejection(rejection(COLLECTIONS.summaries, null, "invalid_id"));
        continue;
      }
      if (await mappingWasApplied(COLLECTIONS.summaries, targetSourceId, TARGETS.summaries)) continue;
      const target = await prepareTarget(COLLECTIONS.summaries, targetSourceId, record, true);
      if (!target) continue;
      if (await summaryTargetExists(db, target)) {
        addRejection(rejection(COLLECTIONS.summaries, targetSourceId, "target_conflict"));
        continue;
      }
      const commentsCount = nonNegativeInteger(record.commentsCount);
      const repliesCount = nonNegativeInteger(record.repliesCount);
      const totalCount = nonNegativeInteger(record.totalCount, (commentsCount ?? 0) + (repliesCount ?? 0));
      const activityCount = nonNegativeInteger(
        record.activityCountIncludingDeleted,
        (commentsCount ?? 0) + (repliesCount ?? 0),
      );
      const dates = timestamps(record, now);
      const lastActivityAt = record.lastActivityAt === undefined
        ? dates?.updatedAt ?? null
        : dateValue(record.lastActivityAt);
      if (commentsCount === null || repliesCount === null || totalCount === null || activityCount === null) {
        addRejection(rejection(COLLECTIONS.summaries, targetSourceId, "invalid_count"));
        continue;
      }
      if (!dates || !lastActivityAt) {
        addRejection(rejection(COLLECTIONS.summaries, targetSourceId, "invalid_timestamps"));
        continue;
      }
      const targetId = planTargetId(COLLECTIONS.summaries, targetSourceId);
      if (!markReady()) continue;
      await db.insert(schema.productDiscussionSummaries).values({
        id: targetId,
        schoolId: target.schoolId,
        productId: target.productId,
        entityType: target.entityType,
        entityId: target.entityId,
        commentsCount,
        repliesCount,
        totalCount,
        activityCountIncludingDeleted: activityCount,
        lastActivityAt,
        lastCommentId: stringValue(record.lastCommentId),
        lastReplyId: stringValue(record.lastReplyId),
        createdAt: dates.createdAt,
        updatedAt: dates.updatedAt,
      });
      await addMapping(db, {
        clock: input.clock,
        runId,
        sourceSystem,
        sourceCollection: COLLECTIONS.summaries,
        sourceId: targetSourceId,
        targetTable: TARGETS.summaries,
        targetId,
        schoolId: target.schoolId,
      });
      counts.imported += 1;
      counts.summariesImported += 1;
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
