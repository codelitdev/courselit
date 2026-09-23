import { readFileSync } from "node:fs";
import { type Clock, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "../db/schema/index.js";
import type { AppDb } from "../types.js";

const SOURCE_SYSTEM = "courselit-mongo";

type JsonRecord = Record<string, unknown>;
type Mode = "dry_run" | "apply";

export type LegacyCommunityExport = {
  communities: readonly unknown[];
  plans: readonly unknown[];
  memberships: readonly unknown[];
  posts: readonly unknown[];
  comments: readonly unknown[];
  reactions: readonly unknown[];
  subscribers: readonly unknown[];
  reports: readonly unknown[];
};

export type CommunityImportCounts = {
  seen: number;
  ready: number;
  imported: number;
  alreadyMapped: number;
  rejected: number;
  communitiesImported: number;
  plansImported: number;
  membershipsImported: number;
  postsImported: number;
  commentsImported: number;
  reactionsImported: number;
  subscribersImported: number;
  reportsImported: number;
};

export type CommunityImportRejection = {
  sourceCollection: string;
  sourceId: string | null;
  code:
    | "invalid_record"
    | "invalid_id"
    | "duplicate_source_id"
    | "school_mapping_missing"
    | "community_mapping_missing"
    | "community_conflict"
    | "creator_not_found"
    | "actor_not_found"
    | "learner_mapping_missing"
    | "post_mapping_missing"
    | "comment_mapping_missing"
    | "plan_mapping_missing"
    | "product_mapping_missing"
    | "invalid_name"
    | "invalid_slug"
    | "invalid_status"
    | "invalid_role"
    | "invalid_type"
    | "invalid_amount"
    | "invalid_timestamps"
    | "media_requires_medialit"
    | "mapping_target_missing"
    | "source_reference_missing"
    | "duplicate_active_plan";
  details: Record<string, string | number | boolean | null>;
};

export type CommunityImportResult = {
  runId: string;
  sourceSystem: string;
  mode: Mode;
  status: "succeeded";
  counts: CommunityImportCounts;
  rejectionByCode: Record<string, number>;
  rejections: CommunityImportRejection[];
};

type Mapping = typeof schema.migrationMappings.$inferSelect;
type Identity = { schoolAccountId: string | null };

const COLLECTIONS = {
  communities: "communities",
  plans: "storefrontPlans",
  memberships: "communityMemberships",
  posts: "communityPosts",
  comments: "communityComments",
  reactions: "communityReactions",
  subscribers: "communityPostSubscribers",
  reports: "communityReports",
} as const;

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

function dateOrDefault(value: unknown, fallback: Date): Date | null {
  return value === undefined ? fallback : dateValue(value);
}

function contentValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined || value === null) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function amountMinor(value: unknown): number | null {
  const number = numberValue(value);
  if (number === null || number < 0) return null;
  const result = Math.round(number * 100);
  return Number.isSafeInteger(result) ? result : null;
}

function slugValue(value: unknown, name: string): string | null {
  const source = stringValue(value) ?? name;
  const slug = source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug && slug.length <= 200 ? slug : null;
}

function rejection(
  sourceCollection: string,
  sourceId: string | null,
  code: CommunityImportRejection["code"],
  details: CommunityImportRejection["details"] = {},
): CommunityImportRejection {
  return { sourceCollection, sourceId, code, details };
}

function sourceIdFor(record: JsonRecord | null, ...keys: string[]): string | null {
  if (!record) return null;
  for (const key of keys) {
    const value = idValue(record[key]);
    if (value) return value;
  }
  return null;
}

function persistableCounts(
  counts: CommunityImportCounts,
  rejectionByCode: Record<string, number>,
): Record<string, number> {
  return {
    ...counts,
    ...Object.fromEntries(
      Object.entries(rejectionByCode).map(([code, count]) => [`rejected_${code}`, count]),
    ),
  };
}

async function findMapping(
  db: AppDb,
  sourceSystem: string,
  sourceCollection: string,
  sourceId: string,
  targetTable: string,
): Promise<Mapping | null> {
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
  return rows[0] ?? null;
}

async function schoolFor(
  db: AppDb,
  sourceSystem: string,
  domainId: string | null,
): Promise<string | null> {
  if (!domainId) return null;
  const mapping = await findMapping(db, sourceSystem, "domains", domainId, "schools");
  return mapping?.schoolId ?? null;
}

async function targetExists(
  db: AppDb,
  table: "media" | "communities" | "storefrontPlans" | "learnerMemberships" | "communityPosts" | "communityComments" | "communityReactions" | "communityPostSubscribers" | "communityReports",
  id: string,
): Promise<boolean> {
  const tableRef = schema[table];
  const rows = await db.select({ id: tableRef.id }).from(tableRef).where(eq(tableRef.id, id)).limit(1);
  return Boolean(rows[0]);
}

async function mappedTarget(
  db: AppDb,
  sourceSystem: string,
  sourceCollection: string,
  sourceId: string,
  targetTable: string,
): Promise<string | null> {
  const mapping = await findMapping(db, sourceSystem, sourceCollection, sourceId, targetTable);
  if (!mapping) return null;
  return (await targetExists(db, targetTable as Parameters<typeof targetExists>[1], mapping.targetId))
    ? mapping.targetId
    : null;
}

async function resolveAdminAccount(
  db: AppDb,
  sourceSystem: string,
  sourceUserId: string | null,
  schoolId: string,
  fallbackToOwner = false,
): Promise<string | null> {
  let userId: string | null = null;
  if (sourceUserId) {
    const direct = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, sourceUserId))
      .limit(1);
    if (direct[0]) userId = direct[0].id;
    else {
      const mapped = await findMapping(db, sourceSystem, "users", sourceUserId, "user");
      if (mapped) {
        const exists = await db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.id, mapped.targetId))
          .limit(1);
        if (exists[0]) userId = exists[0].id;
      }
    }
  }
  if (userId) {
    const membership = await db
      .select({ schoolAccountId: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .innerJoin(
        schema.memberships,
        eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
      )
      .where(and(eq(schema.schoolAccounts.schoolId, schoolId), eq(schema.schoolAccounts.userId, userId)))
      .limit(1);
    if (membership[0]?.schoolAccountId) return membership[0].schoolAccountId;
  }
  if (!fallbackToOwner) return null;
  const owner = await db
    .select({ schoolAccountId: schema.memberships.schoolAccountId })
    .from(schema.memberships)
    .where(and(eq(schema.memberships.schoolId, schoolId), eq(schema.memberships.isOwner, true)))
    .limit(1);
  return owner[0]?.schoolAccountId ?? null;
}

async function resolveAdminUserId(
  db: AppDb,
  sourceSystem: string,
  sourceUserId: string | null,
  schoolId: string,
  fallbackToOwner = false,
): Promise<string | null> {
  let userId: string | null = null;
  if (sourceUserId) {
    const direct = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, sourceUserId))
      .limit(1);
    if (direct[0]) userId = direct[0].id;
    else {
      const mapped = await findMapping(db, sourceSystem, "users", sourceUserId, "user");
      if (mapped) {
        const exists = await db
          .select({ id: schema.user.id })
          .from(schema.user)
          .where(eq(schema.user.id, mapped.targetId))
          .limit(1);
        if (exists[0]) userId = exists[0].id;
      }
    }
  }
  if (userId) {
    const membership = await db
      .select({ userId: schema.schoolAccounts.userId })
      .from(schema.schoolAccounts)
      .innerJoin(
        schema.memberships,
        eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
      )
      .where(and(eq(schema.schoolAccounts.schoolId, schoolId), eq(schema.schoolAccounts.userId, userId)))
      .limit(1);
    if (membership[0]?.userId) return membership[0].userId;
  }
  if (!fallbackToOwner) return null;
  const owner = await db
    .select({ userId: schema.schoolAccounts.userId })
    .from(schema.schoolAccounts)
    .innerJoin(
      schema.memberships,
      eq(schema.memberships.schoolAccountId, schema.schoolAccounts.id),
    )
    .where(and(eq(schema.schoolAccounts.schoolId, schoolId), eq(schema.memberships.isOwner, true)))
    .limit(1);
  return owner[0]?.userId ?? null;
}

async function resolveLearner(
  db: AppDb,
  sourceSystem: string,
  sourceUserId: string | null,
  schoolId: string,
): Promise<string | null> {
  if (!sourceUserId) return null;
  if (isUuid(sourceUserId)) {
    const direct = await db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(and(eq(schema.schoolAccounts.id, sourceUserId), eq(schema.schoolAccounts.schoolId, schoolId)))
      .limit(1);
    if (direct[0]) return direct[0].id;
  }
  const mapping = (await findMapping(db, sourceSystem, "users", sourceUserId, "school_accounts"))
    ?? (await findMapping(db, sourceSystem, "users", sourceUserId, "learners"));
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
  const kind = stringValue(record.userKind ?? record.authorKind ?? record.reporterKind);
  if (kind === "admin" || record.isAdmin === true) {
    return { schoolAccountId: await resolveAdminAccount(db, sourceSystem, sourceUserId, schoolId, false) };
  }
  if (kind === "learner") {
    return { schoolAccountId: await resolveLearner(db, sourceSystem, sourceUserId, schoolId) };
  }
  const adminAccountId = await resolveAdminAccount(db, sourceSystem, sourceUserId, schoolId, false);
  if (adminAccountId) return { schoolAccountId: adminAccountId };
  return { schoolAccountId: await resolveLearner(db, sourceSystem, sourceUserId, schoolId) };
}

function hasIdentity(identity: Identity): boolean {
  return Boolean(identity.schoolAccountId);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function normalizeStatus(value: unknown): "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused" | null {
  const status = stringValue(value)?.toLowerCase();
  if (!status) return "active";
  if (status === "approved") return "active";
  if (status === "cancelled" || status === "canceled" || status === "inactive") return "expired";
  return ["active", "payment_failed", "expired", "pending", "rejected", "paused"].includes(status)
    ? (status as "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused")
    : null;
}

function normalizeRole(value: unknown): "member" | "moderator" | "owner" | null {
  const role = stringValue(value)?.toLowerCase();
  if (!role || role === "user") return "member";
  if (role === "admin") return "owner";
  return ["member", "moderator", "owner"].includes(role)
    ? (role as "member" | "moderator" | "owner")
    : null;
}

function normalizePlanKind(value: unknown): "free" | "one_time" | "subscription" | "installment" | null {
  const kind = stringValue(value)?.toLowerCase();
  if (!kind || kind === "free") return "free";
  if (kind === "onetime" || kind === "one-time" || kind === "one_time") return "one_time";
  if (kind === "emi" || kind === "installment") return "installment";
  if (kind === "subscription" || kind === "recurring") return "subscription";
  return null;
}

function normalizeEntityType(value: unknown): "post" | "comment" | "reply" | null {
  const type = stringValue(value)?.toLowerCase();
  if (type === "post" || type === "comment" || type === "reply") return type;
  return null;
}

function normalizeTimestamps(record: JsonRecord, now: Date): { createdAt: Date; updatedAt: Date } | null {
  const createdAt = dateOrDefault(record.createdAt, now);
  const updatedAt = dateOrDefault(record.updatedAt, createdAt ?? now);
  return createdAt && updatedAt ? { createdAt, updatedAt } : null;
}

export function readLegacyCommunityExport(path: string): LegacyCommunityExport {
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (Array.isArray(parsed)) {
    return {
      communities: parsed,
      plans: [],
      memberships: [],
      posts: [],
      comments: [],
      reactions: [],
      subscribers: [],
      reports: [],
    };
  }
  const object = asRecord(parsed);
  if (!object || !Array.isArray(object.communities)) {
    throw new Error("community_export_must_be_array_or_object_with_communities_array");
  }
  const arrays = ["plans", "memberships", "posts", "comments", "reactions", "subscribers", "reports"] as const;
  for (const name of arrays) {
    if (object[name] !== undefined && !Array.isArray(object[name])) {
      throw new Error(`community_export_${name}_must_be_array`);
    }
  }
  return {
    communities: object.communities as readonly unknown[],
    plans: (object.plans ?? []) as readonly unknown[],
    memberships: (object.memberships ?? []) as readonly unknown[],
    posts: (object.posts ?? []) as readonly unknown[],
    comments: (object.comments ?? []) as readonly unknown[],
    reactions: (object.reactions ?? []) as readonly unknown[],
    subscribers: (object.subscribers ?? []) as readonly unknown[],
    reports: (object.reports ?? []) as readonly unknown[],
  };
}

export async function importLegacyCommunities(
  db: AppDb,
  input: {
    exportData: LegacyCommunityExport;
    clock: Clock;
    mode?: Mode;
    sourceSystem?: string;
  },
): Promise<CommunityImportResult> {
  const now = input.clock.now();
  const mode = input.mode ?? "dry_run";
  const sourceSystem = input.sourceSystem ?? SOURCE_SYSTEM;
  const data = input.exportData;
  const allRecords = Object.values(data).reduce((sum, records) => sum + records.length, 0);
  const counts: CommunityImportCounts = {
    seen: allRecords,
    ready: 0,
    imported: 0,
    alreadyMapped: 0,
    rejected: 0,
    communitiesImported: 0,
    plansImported: 0,
    membershipsImported: 0,
    postsImported: 0,
    commentsImported: 0,
    reactionsImported: 0,
    subscribersImported: 0,
    reportsImported: 0,
  };
  const rejectionByCode: Record<string, number> = {};
  const rejections: CommunityImportRejection[] = [];
  const runId = uuidv7(input.clock);
  const seen = new Set<string>();

  await db.insert(schema.migrationRuns).values({
    id: runId,
    sourceSystem,
    scope: "communities",
    mode,
    status: "running",
    counts: persistableCounts(counts, rejectionByCode),
    startedAt: now,
  });

  const addRejection = (item: CommunityImportRejection) => {
    rejections.push(item);
    counts.rejected += 1;
    rejectionByCode[item.code] = (rejectionByCode[item.code] ?? 0) + 1;
  };

  const mappedOrReject = async (
    collection: string,
    sourceId: string,
    targetTable: Parameters<typeof targetExists>[1],
  ): Promise<string | null> => {
    const targetId = await mappedTarget(db, sourceSystem, collection, sourceId, targetTable);
    if (!targetId) {
      addRejection(rejection(collection, sourceId, "source_reference_missing", { targetTable }));
      return null;
    }
    return targetId;
  };

  const mappingStatus = async (
    collection: string,
    sourceId: string,
    targetTable: Parameters<typeof targetExists>[1],
  ): Promise<boolean> => {
    const mapping = await findMapping(db, sourceSystem, collection, sourceId, targetTable);
    if (!mapping) return false;
    if (!(await targetExists(db, targetTable, mapping.targetId))) {
      addRejection(rejection(collection, sourceId, "mapping_target_missing", { targetId: mapping.targetId }));
      return true;
    }
    counts.alreadyMapped += 1;
    return true;
  };

  const addReady = () => {
    counts.ready += 1;
    return mode === "apply";
  };

  const communityMedia = async (
    record: JsonRecord,
    resourcePublicId: string,
    schoolId: string,
  ): Promise<Array<{ mediaId: string; sourceId: string }> | null> => {
    if (record.media === undefined) return [];
    if (!Array.isArray(record.media)) {
      addRejection(rejection("media", resourcePublicId, "media_requires_medialit", { reason: "media_not_an_array" }));
      return null;
    }
    const refs: Array<{ mediaId: string; sourceId: string }> = [];
    for (const item of record.media) {
      const sourceId = idValue(item) ?? sourceIdFor(asRecord(item), "mediaId", "_id", "id");
      if (!sourceId) {
        addRejection(rejection("media", resourcePublicId, "media_requires_medialit", { reason: "media_id_missing" }));
        return null;
      }
      const mediaId = await mappedTarget(db, sourceSystem, "media", sourceId, "media");
      if (!mediaId) {
        addRejection(rejection("media", sourceId, "media_requires_medialit", { resourcePublicId }));
        return null;
      }
      const media = await db
        .select({ id: schema.media.id })
        .from(schema.media)
        .where(and(eq(schema.media.id, mediaId), eq(schema.media.schoolId, schoolId)))
        .limit(1);
      if (!media[0]) {
        addRejection(rejection("media", sourceId, "media_requires_medialit", { resourcePublicId, reason: "catalog_school_mismatch" }));
        return null;
      }
      refs.push({ mediaId, sourceId });
    }
    return refs;
  };

  const persistCommunityMedia = async (
    refs: Array<{ mediaId: string; sourceId: string }>,
    resourceInternalId: string,
    resourcePublicId: string,
    schoolId: string,
  ) => {
    if (mode !== "apply") return;
    for (const ref of refs) {
      await db.insert(schema.mediaReferences).values({
        id: uuidv7(input.clock),
        schoolId,
        mediaId: ref.mediaId,
        resourceType: "community_content",
        resourceInternalId,
        resourcePublicId,
        parentResourceInternalId: null,
        parentResourcePublicId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  };

  try {
    for (const raw of data.communities) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "communityId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      const duplicateKey = `${COLLECTIONS.communities}:${sourceId}`;
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingStatus(COLLECTIONS.communities, sourceId, "communities")) continue;
      const name = stringValue(record.name);
      const slug = slugValue(record.slug, name ?? "");
      const schoolId = await schoolFor(db, sourceSystem, sourceIdFor(record, "domain", "domainId"));
      if (!schoolId) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "school_mapping_missing"));
        continue;
      }
      if (!name) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "invalid_name"));
        continue;
      }
      if (!slug) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "invalid_slug"));
        continue;
      }
      const timestamps = normalizeTimestamps(record, now);
      const creatorId = await resolveAdminUserId(db, sourceSystem, sourceIdFor(record, "creatorId", "createdBy"), schoolId, false);
      if (!timestamps) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "invalid_timestamps"));
        continue;
      }
      if (!creatorId) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "creator_not_found"));
        continue;
      }
      const existing = await db.select({ id: schema.communities.id }).from(schema.communities).where(and(eq(schema.communities.schoolId, schoolId), eq(schema.communities.slug, slug))).limit(1);
      if (existing[0]) {
        addRejection(rejection(COLLECTIONS.communities, sourceId, "community_conflict", { slug }));
        continue;
      }
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      const deleted = record.deleted === true;
      await db.insert(schema.communities).values({
        id: targetId,
        publicId: sourceId,
        schoolId,
        name,
        slug,
        description: contentValue(record.description),
        banner: contentValue(record.banner),
        categories: JSON.stringify(stringArray(record.categories).length > 0 ? stringArray(record.categories) : ["General"]),
        autoAcceptMembers: booleanValue(record.autoAcceptMembers, true),
        joiningReasonText: stringValue(record.joiningReasonText) ?? "",
        deletedAt: deleted ? timestamps.updatedAt : null,
        createdBy: creatorId,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.communities, sourceId, targetTable: "communities", targetId, schoolId });
      counts.imported += 1;
      counts.communitiesImported += 1;
    }

    for (const raw of data.plans) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "planId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      const duplicateKey = `${COLLECTIONS.plans}:${sourceId}`;
      if (seen.has(duplicateKey)) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(duplicateKey);
      if (await mappingStatus(COLLECTIONS.plans, sourceId, "storefrontPlans")) continue;
      const communitySourceId = sourceIdFor(record, "communityId", "entityId", "community");
      if (!communitySourceId) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "community_mapping_missing"));
        continue;
      }
      const communityId = await mappedOrReject(COLLECTIONS.communities, communitySourceId, "communities");
      if (!communityId) continue;
      const community = await db.select({ schoolId: schema.communities.schoolId }).from(schema.communities).where(eq(schema.communities.id, communityId)).limit(1);
      const communityRow = community[0];
      if (!communityRow) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "community_mapping_missing"));
        continue;
      }
      const name = stringValue(record.name);
      const kind = normalizePlanKind(record.kind ?? record.type);
      const timestamps = normalizeTimestamps(record, now);
      if (!name || name.length > 200) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "invalid_name"));
        continue;
      }
      if (!kind) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "invalid_type"));
        continue;
      }
      if (!timestamps) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "invalid_timestamps"));
        continue;
      }
      const creatorId = await resolveAdminUserId(db, sourceSystem, sourceIdFor(record, "creatorId", "createdBy"), communityRow.schoolId, true);
      if (!creatorId) {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "creator_not_found"));
        continue;
      }
      const oneTimeAmount = numberValue(record.oneTimeAmount);
      const emiAmount = numberValue(record.emiAmount);
      const subscriptionMonthlyAmount = numberValue(record.subscriptionMonthlyAmount);
      const subscriptionYearlyAmount = numberValue(record.subscriptionYearlyAmount);
      const amount = record.amountMinor !== undefined ? numberValue(record.amountMinor) : amountMinor(record.amount ?? record.price);
      if (amount === null && kind !== "free") {
        addRejection(rejection(COLLECTIONS.plans, sourceId, "invalid_amount"));
        continue;
      }
      const includedSourceIds = stringArray(record.includedProducts ?? record.includedCourses);
      const includedProducts: string[] = [];
      let includeFailure = false;
      for (const includedSourceId of includedSourceIds) {
        const productMapping = await findMapping(db, sourceSystem, "courses", includedSourceId, "products");
        if (!productMapping) {
          addRejection(rejection(COLLECTIONS.plans, sourceId, "product_mapping_missing", { productId: includedSourceId }));
          includeFailure = true;
          break;
        }
        const product = await db.select({ publicId: schema.products.publicId }).from(schema.products).where(and(eq(schema.products.id, productMapping.targetId), eq(schema.products.schoolId, communityRow.schoolId))).limit(1);
        if (!product[0]) {
          addRejection(rejection(COLLECTIONS.plans, sourceId, "product_mapping_missing", { productId: includedSourceId }));
          includeFailure = true;
          break;
        }
        includedProducts.push(product[0].publicId);
      }
      if (includeFailure) continue;
      const activeDefault = booleanValue(record.isDefault ?? record.default, false);
      if (activeDefault) {
        const existingDefault = await db.select({ id: schema.storefrontPlans.id }).from(schema.storefrontPlans).where(and(eq(schema.storefrontPlans.entityType, "community"), eq(schema.storefrontPlans.entityId, communitySourceId), eq(schema.storefrontPlans.status, "active"), eq(schema.storefrontPlans.isDefault, true))).limit(1);
        if (existingDefault[0]) {
          addRejection(rejection(COLLECTIONS.plans, sourceId, "duplicate_active_plan"));
          continue;
        }
      }
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      await db.insert(schema.storefrontPlans).values({
        id: targetId,
        publicId: sourceId,
        schoolId: communityRow.schoolId,
        entityType: "community",
        entityId: communitySourceId,
        name,
        description: stringValue(record.description) ?? "",
        includedProducts,
        providerProductId: stringValue(record.providerProductId),
        kind,
        oneTimeAmount,
        emiAmount,
        emiTotalInstallments: numberValue(record.emiTotalInstallments),
        subscriptionMonthlyAmount,
        subscriptionYearlyAmount,
        amountMinor: amount ?? 0,
        billingInterval: stringValue(record.billingInterval) === "year" ? "year" : stringValue(record.billingInterval) === "month" ? "month" : null,
        installmentCount: numberValue(record.installmentCount),
        status: stringValue(record.status)?.toLowerCase() === "archived" ? "archived" : "active",
        isDefault: activeDefault,
        createdBy: creatorId,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.plans, sourceId, targetTable: "storefrontPlans", targetId, schoolId: communityRow.schoolId });
      counts.imported += 1;
      counts.plansImported += 1;
    }

    const communityTarget = async (record: JsonRecord, collection: string, sourceId: string) => {
      const communitySourceId = sourceIdFor(record, "communityId", "community", "entityId");
      if (!communitySourceId) {
        addRejection(rejection(collection, sourceId, "community_mapping_missing"));
        return null;
      }
      return mappedOrReject(COLLECTIONS.communities, communitySourceId, "communities");
    };

    for (const raw of data.memberships) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "membershipId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.memberships, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      if (seen.has(`${COLLECTIONS.memberships}:${sourceId}`)) {
        addRejection(rejection(COLLECTIONS.memberships, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(`${COLLECTIONS.memberships}:${sourceId}`);
      if (await mappingStatus(COLLECTIONS.memberships, sourceId, "learnerMemberships")) continue;
      const communityId = await communityTarget(record, COLLECTIONS.memberships, sourceId);
      if (!communityId) continue;
      const community = await db
        .select({ schoolId: schema.communities.schoolId, publicId: schema.communities.publicId })
        .from(schema.communities)
        .where(eq(schema.communities.id, communityId))
        .limit(1);
      const communityRow = community[0];
      const status = normalizeStatus(record.status);
      const role = normalizeRole(record.role);
      const timestamps = normalizeTimestamps(record, now);
      if (!communityRow || !status || !role || !timestamps) {
        addRejection(rejection(COLLECTIONS.memberships, sourceId, !status ? "invalid_status" : !role ? "invalid_role" : "invalid_timestamps"));
        continue;
      }
      const identity = await resolveIdentity(db, sourceSystem, record, communityRow.schoolId);
      if (!hasIdentity(identity)) {
        addRejection(rejection(COLLECTIONS.memberships, sourceId, "actor_not_found"));
        continue;
      }
      const planSourceId = sourceIdFor(record, "paymentPlanId", "planId");
      const paymentPlanInternalId = planSourceId
        ? await mappedTarget(db, sourceSystem, COLLECTIONS.plans, planSourceId, "storefrontPlans")
        : null;
      if (planSourceId && !paymentPlanInternalId) {
        addRejection(rejection(COLLECTIONS.memberships, sourceId, "plan_mapping_missing", { planId: planSourceId }));
        continue;
      }
      const paymentPlan = paymentPlanInternalId
        ? await db
            .select({ publicId: schema.storefrontPlans.publicId })
            .from(schema.storefrontPlans)
            .where(eq(schema.storefrontPlans.id, paymentPlanInternalId))
            .limit(1)
        : [];
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      await db.insert(schema.learnerMemberships).values({
        id: targetId,
        publicId: sourceId,
        schoolId: communityRow.schoolId,
        schoolAccountId: identity.schoolAccountId!,
        entityType: "community",
        entityId: communityRow.publicId,
        paymentPlanId: paymentPlan[0]?.publicId ?? null,
        isIncludedInPlan: false,
        parentMembershipId: null,
        status,
        role:
          status === "active" && (role === "moderator" || role === "owner")
            ? "moderate"
            : status === "active"
              ? "post"
              : "comment",
        joiningReason: stringValue(record.joiningReason) ?? "",
        rejectionReason: stringValue(record.rejectionReason),
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.memberships, sourceId, targetTable: "learnerMemberships", targetId, schoolId: communityRow.schoolId });
      counts.imported += 1;
      counts.membershipsImported += 1;
    }

    for (const raw of data.posts) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "postId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.posts, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      if (seen.has(`${COLLECTIONS.posts}:${sourceId}`)) {
        addRejection(rejection(COLLECTIONS.posts, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(`${COLLECTIONS.posts}:${sourceId}`);
      if (await mappingStatus(COLLECTIONS.posts, sourceId, "communityPosts")) continue;
      const communityId = await communityTarget(record, COLLECTIONS.posts, sourceId);
      if (!communityId) continue;
      const community = await db.select({ schoolId: schema.communities.schoolId }).from(schema.communities).where(eq(schema.communities.id, communityId)).limit(1);
      const communityRow = community[0];
      const timestamps = normalizeTimestamps(record, now);
      const identity = communityRow ? await resolveIdentity(db, sourceSystem, record, communityRow.schoolId) : { schoolAccountId: null };
      if (!communityRow || !timestamps) {
        addRejection(rejection(COLLECTIONS.posts, sourceId, "invalid_timestamps"));
        continue;
      }
      if (!hasIdentity(identity)) {
        addRejection(rejection(COLLECTIONS.posts, sourceId, "actor_not_found"));
        continue;
      }
      const targetId = uuidv7(input.clock);
      const mediaRefs = await communityMedia(record, sourceId, communityRow.schoolId);
      if (mediaRefs === null) continue;
      if (!addReady()) continue;
      await db.insert(schema.communityPosts).values({
        id: targetId,
        publicId: sourceId,
        schoolId: communityRow.schoolId,
        communityId,
        schoolAccountId: identity.schoolAccountId!,
        title: stringValue(record.title) ?? "",
        content: contentValue(record.content),
        category: stringValue(record.category) ?? "General",
        pinned: booleanValue(record.pinned, false),
        deletedAt: record.deleted === true ? timestamps.updatedAt : null,
        createdAt: timestamps.createdAt,
        updatedAt: timestamps.updatedAt,
      });
      await persistCommunityMedia(mediaRefs, targetId, sourceId, communityRow.schoolId);
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.posts, sourceId, targetTable: "communityPosts", targetId, schoolId: communityRow.schoolId });
      counts.imported += 1;
      counts.postsImported += 1;
    }

    const commentRows = new Map<string, { id: string; postId: string; communityId: string; schoolId: string }>();
    for (const raw of data.comments) {
      const record = asRecord(raw);
      if (!record) {
        addRejection(rejection(COLLECTIONS.comments, null, "invalid_record"));
        continue;
      }
      const rootSourceId = sourceIdFor(record, "commentId", "_id", "id");
      const replies = Array.isArray(record.replies) ? record.replies : [];
      const flattened = [{ record, sourceId: rootSourceId, parentSourceId: null as string | null }, ...replies.map((reply) => ({ record: asRecord(reply), sourceId: sourceIdFor(asRecord(reply), "replyId", "_id", "id"), parentSourceId: rootSourceId }))];
      for (const item of flattened) {
        const itemRecord = item.record;
        const sourceId = item.sourceId;
        if (!itemRecord || !sourceId) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, itemRecord ? "invalid_id" : "invalid_record"));
          continue;
        }
        if (seen.has(`${COLLECTIONS.comments}:${sourceId}`)) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, "duplicate_source_id"));
          continue;
        }
        seen.add(`${COLLECTIONS.comments}:${sourceId}`);
        if (await mappingStatus(COLLECTIONS.comments, sourceId, "communityComments")) continue;
        const postSourceId = sourceIdFor(itemRecord, "postId") ?? sourceIdFor(record, "postId");
        if (!postSourceId) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, "post_mapping_missing"));
          continue;
        }
        const postId = await mappedOrReject(COLLECTIONS.posts, postSourceId, "communityPosts");
        if (!postId) continue;
        const post = await db.select({ communityId: schema.communityPosts.communityId, schoolId: schema.communityPosts.schoolId }).from(schema.communityPosts).where(eq(schema.communityPosts.id, postId)).limit(1);
        const postRow = post[0];
        const timestamps = normalizeTimestamps(itemRecord, now);
        const identity = postRow ? await resolveIdentity(db, sourceSystem, itemRecord, postRow.schoolId) : { schoolAccountId: null };
        if (!postRow || !timestamps) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, "invalid_timestamps"));
          continue;
        }
        if (!hasIdentity(identity)) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, "actor_not_found"));
          continue;
        }
        const parentId = item.parentSourceId ? await mappedTarget(db, sourceSystem, COLLECTIONS.comments, item.parentSourceId, "communityComments") : null;
        if (item.parentSourceId && !parentId) {
          addRejection(rejection(COLLECTIONS.comments, sourceId, "comment_mapping_missing", { parentId: item.parentSourceId }));
          continue;
        }
        const targetId = uuidv7(input.clock);
        const mediaRefs = await communityMedia(itemRecord, sourceId, postRow.schoolId);
        if (mediaRefs === null) continue;
        if (!addReady()) continue;
        await db.insert(schema.communityComments).values({
          id: targetId,
          publicId: sourceId,
          schoolId: postRow.schoolId,
          communityId: postRow.communityId,
          postId,
          parentCommentId: parentId,
          schoolAccountId: identity.schoolAccountId!,
          content: contentValue(itemRecord.content),
          deletedAt: itemRecord.deleted === true ? timestamps.updatedAt : null,
          createdAt: timestamps.createdAt,
          updatedAt: timestamps.updatedAt,
        });
        await persistCommunityMedia(mediaRefs, targetId, sourceId, postRow.schoolId);
        await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.comments, sourceId, targetTable: "communityComments", targetId, schoolId: postRow.schoolId });
        commentRows.set(sourceId, { id: targetId, postId, communityId: postRow.communityId, schoolId: postRow.schoolId });
        counts.imported += 1;
        counts.commentsImported += 1;
      }
    }

    for (const raw of data.reactions) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "reactionId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.reactions, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      if (seen.has(`${COLLECTIONS.reactions}:${sourceId}`)) {
        addRejection(rejection(COLLECTIONS.reactions, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(`${COLLECTIONS.reactions}:${sourceId}`);
      if (await mappingStatus(COLLECTIONS.reactions, sourceId, "communityReactions")) continue;
      const entityType = normalizeEntityType(record.entityType);
      const entitySourceId = sourceIdFor(record, "entityId", "postId", "commentId");
      if (!entityType || !entitySourceId) {
        addRejection(rejection(COLLECTIONS.reactions, sourceId, "source_reference_missing"));
        continue;
      }
      const entityCollection = entityType === "post" ? COLLECTIONS.posts : COLLECTIONS.comments;
      const entityTable = entityType === "post" ? "communityPosts" : "communityComments";
      const entityId = await mappedOrReject(entityCollection, entitySourceId, entityTable);
      if (!entityId) continue;
      const entity = entityType === "post"
        ? await db.select({ communityId: schema.communityPosts.communityId, schoolId: schema.communityPosts.schoolId }).from(schema.communityPosts).where(eq(schema.communityPosts.id, entityId)).limit(1)
        : await db.select({ communityId: schema.communityComments.communityId, schoolId: schema.communityComments.schoolId }).from(schema.communityComments).where(eq(schema.communityComments.id, entityId)).limit(1);
      const entityRow = entity[0];
      const identity = entityRow ? await resolveIdentity(db, sourceSystem, record, entityRow.schoolId) : { schoolAccountId: null };
      const emoji = stringValue(record.emoji);
      if (!entityRow || !emoji || !hasIdentity(identity)) {
        addRejection(rejection(COLLECTIONS.reactions, sourceId, !hasIdentity(identity) ? "actor_not_found" : "source_reference_missing"));
        continue;
      }
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      await db.insert(schema.communityReactions).values({ id: targetId, publicId: sourceId, schoolId: entityRow.schoolId, communityId: entityRow.communityId, entityType, entityId, emoji, schoolAccountId: identity.schoolAccountId! });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.reactions, sourceId, targetTable: "communityReactions", targetId, schoolId: entityRow.schoolId });
      counts.imported += 1;
      counts.reactionsImported += 1;
    }

    for (const raw of data.subscribers) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "subscriptionId", "_id", "id", "postId");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.subscribers, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      if (seen.has(`${COLLECTIONS.subscribers}:${sourceId}`)) {
        addRejection(rejection(COLLECTIONS.subscribers, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(`${COLLECTIONS.subscribers}:${sourceId}`);
      if (await mappingStatus(COLLECTIONS.subscribers, sourceId, "communityPostSubscribers")) continue;
      const postSourceId = sourceIdFor(record, "postId");
      const postId = postSourceId ? await mappedOrReject(COLLECTIONS.posts, postSourceId, "communityPosts") : null;
      if (!postId) continue;
      const post = await db.select({ communityId: schema.communityPosts.communityId, schoolId: schema.communityPosts.schoolId }).from(schema.communityPosts).where(eq(schema.communityPosts.id, postId)).limit(1);
      const postRow = post[0];
      const identity = postRow ? await resolveIdentity(db, sourceSystem, record, postRow.schoolId) : { schoolAccountId: null };
      if (!postRow || !hasIdentity(identity)) {
        addRejection(rejection(COLLECTIONS.subscribers, sourceId, !postRow ? "post_mapping_missing" : "actor_not_found"));
        continue;
      }
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      await db.insert(schema.communityPostSubscribers).values({ id: targetId, schoolId: postRow.schoolId, communityId: postRow.communityId, postId, schoolAccountId: identity.schoolAccountId! });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.subscribers, sourceId, targetTable: "communityPostSubscribers", targetId, schoolId: postRow.schoolId });
      counts.imported += 1;
      counts.subscribersImported += 1;
    }

    for (const raw of data.reports) {
      const record = asRecord(raw);
      const sourceId = sourceIdFor(record, "reportId", "_id", "id");
      if (!record || !sourceId) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, record ? "invalid_id" : "invalid_record"));
        continue;
      }
      if (seen.has(`${COLLECTIONS.reports}:${sourceId}`)) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "duplicate_source_id"));
        continue;
      }
      seen.add(`${COLLECTIONS.reports}:${sourceId}`);
      if (await mappingStatus(COLLECTIONS.reports, sourceId, "communityReports")) continue;
      const communityId = await communityTarget(record, COLLECTIONS.reports, sourceId);
      if (!communityId) continue;
      const community = await db.select({ schoolId: schema.communities.schoolId }).from(schema.communities).where(eq(schema.communities.id, communityId)).limit(1);
      const communityRow = community[0];
      const contentType = normalizeEntityType(record.type ?? record.contentType);
      const contentSourceId = sourceIdFor(record, "contentId");
      const contentCollection = contentType === "post" ? COLLECTIONS.posts : COLLECTIONS.comments;
      const contentTable = contentType === "post" ? "communityPosts" : "communityComments";
      const contentId = contentSourceId && contentType ? await mappedTarget(db, sourceSystem, contentCollection, contentSourceId, contentTable) : null;
      const identity = communityRow ? await resolveIdentity(db, sourceSystem, record, communityRow.schoolId) : { schoolAccountId: null };
      const timestamps = normalizeTimestamps(record, now);
      if (!communityRow || !contentType || !contentId || !timestamps || !hasIdentity(identity)) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, !hasIdentity(identity) ? "actor_not_found" : "source_reference_missing"));
        continue;
      }
      const parentSourceId = sourceIdFor(record, "contentParentId");
      const contentParentId = parentSourceId ? await mappedTarget(db, sourceSystem, COLLECTIONS.comments, parentSourceId, "communityComments") : null;
      if (parentSourceId && !contentParentId) {
        addRejection(rejection(COLLECTIONS.reports, sourceId, "comment_mapping_missing", { parentId: parentSourceId }));
        continue;
      }
      if (!addReady()) continue;
      const targetId = uuidv7(input.clock);
      const status = stringValue(record.status)?.toLowerCase();
      const normalizedStatus = status === "accepted" || status === "rejected" ? status : "pending";
      await db.insert(schema.communityReports).values({ id: targetId, publicId: sourceId, schoolId: communityRow.schoolId, communityId, contentType, contentId, contentParentId, schoolAccountId: identity.schoolAccountId!, reason: stringValue(record.reason) ?? "", status: normalizedStatus, rejectionReason: stringValue(record.rejectionReason), createdAt: timestamps.createdAt, updatedAt: timestamps.updatedAt });
      await addMapping(db, { clock: input.clock, runId, sourceSystem, sourceCollection: COLLECTIONS.reports, sourceId, targetTable: "communityReports", targetId, schoolId: communityRow.schoolId });
      counts.imported += 1;
      counts.reportsImported += 1;
    }

    if (rejections.length > 0) {
      await db.insert(schema.migrationRejections).values(rejections.map((item) => ({ id: uuidv7(input.clock), runId, sourceSystem, sourceCollection: item.sourceCollection, sourceId: item.sourceId, code: item.code, details: item.details, createdAt: now })));
    }
    await db.update(schema.migrationRuns).set({ status: "succeeded", counts: persistableCounts(counts, rejectionByCode), completedAt: input.clock.now() }).where(eq(schema.migrationRuns.id, runId));
  } catch (error) {
    await db.update(schema.migrationRuns).set({ status: "failed", counts: persistableCounts(counts, rejectionByCode), errorCode: error instanceof Error ? error.name : "unknown_error", completedAt: input.clock.now() }).where(eq(schema.migrationRuns.id, runId));
    throw error;
  }

  return { runId, sourceSystem, mode, status: "succeeded", counts, rejectionByCode, rejections };
}
