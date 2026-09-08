import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { revokeCommunityMembershipAccess } from "./community-commerce.js";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import { getPaymentProvider, type PaymentProvider } from "./payments.js";
import { createPendingSalesPage } from "./frontlit-sales-pages.js";
import {
  type MediaKind,
  mediaIdsForRichTextContent,
  reconcileMediaReferencesInTransaction,
} from "./media.js";
import { createLearnerNotification } from "./notifications.js";
import type { CourseLitPermission } from "./permissions.js";
import type { AppDb } from "./types.js";

type AdminContext = PlatformRequestContext<string, string, CourseLitPermission>;

const DELETED_COMMUNITY_CONTENT = "Deleted";

export type CommunityLearnerViewer = {
  kind: "learner";
  schoolId: string;
  schoolPublicId: string;
  learnerId: string;
  learnerPublicId: string;
};

export type CommunityViewer =
  | { kind: "admin"; context: AdminContext }
  | CommunityLearnerViewer;

export type CommunityDto = {
  id: string;
  schoolId: string;
  name: string;
  slug: string;
  description: string;
  banner: string;
  categories: string[];
  enabled: boolean;
  autoAcceptMembers: boolean;
  joiningReasonText: string;
  featuredMedia: CommunityFeaturedMediaDto | null;
  membersCount: number;
  postsCount: number;
  deletedAt: string | null;
  membership: CommunityMembershipDto | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityFeaturedMediaDto = {
  id: string;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  altText: string;
};

export type CommunityActorDto = {
  id: string;
  kind: "learner" | "admin";
  name: string;
  email: string | null;
  imageUrl: string | null;
};

export type CommunityMembershipDto = {
  id: string;
  communityId: string;
  learnerId: string | null;
  adminUserId: string | null;
  member: CommunityActorDto | null;
  status: "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused";
  role: "member" | "moderator" | "owner";
  joiningReason: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityPostDto = {
  id: string;
  communityId: string;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  author: CommunityActorDto | null;
  title: string;
  content: string;
  category: string;
  media: CommunityMediaDto[];
  reactions: CommunityReactionDto[];
  commentsCount: number;
  subscribed: boolean;
  pinned: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LearnerFeedPostDto = CommunityPostDto & {
  community: {
    id: string;
    name: string;
    slug: string;
  };
};

export type CommunityCommentDto = {
  id: string;
  communityId: string;
  postId: string;
  parentCommentId: string | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  author: CommunityActorDto | null;
  content: string;
  media: CommunityMediaDto[];
  reactions: CommunityReactionDto[];
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityMediaDto = {
  id: string;
  type: "image" | "video" | "pdf";
  title: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
};

export type CommunityReactionDto = {
  emoji: string;
  count: number;
  active: boolean;
};

export type CommunityReportDto = {
  id: string;
  communityId: string;
  contentType: "post" | "comment" | "reply";
  contentId: string;
  contentParentId: string | null;
  reporterId: string | null;
  reporterKind: "learner" | "admin" | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: CommunityReportContentDto | null;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommunityReportContentDto = {
  id: string;
  content: string;
  media: CommunityMediaDto[];
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  author: CommunityActorDto | null;
};

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

const EMOJIS = ["👍", "❤️", "😄", "🎉", "😢", "😮"] as const;
type CommunityEmoji = (typeof EMOJIS)[number];

type Identity =
  | { kind: "learner"; id: string; publicId: string }
  | { kind: "admin"; id: string; publicId: string };

function forbidden(): Result<never> {
  return { ok: false, error: createPlatformError("forbidden") };
}

function notFound(): Result<never> {
  return { ok: false, error: createPlatformError("not_found") };
}

function adminCan(context: AdminContext, permission: CourseLitPermission): boolean {
  return Boolean(context.tenantId && context.permissions.has(permission));
}

function communityContext(context: AdminContext): { schoolId: string } | null {
  return context.tenantId ? { schoolId: context.tenantId } : null;
}

function parseCategories(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const categories = parsed.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      );
      if (categories.length > 0) return categories;
    }
  } catch {
    // Keep malformed legacy values usable rather than failing the whole community read.
  }
  return ["General"];
}

function communityContentHasText(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return true;

    let hasText = false;
    const visit = (node: unknown) => {
      if (!node || typeof node !== "object" || hasText) return;
      const record = node as { text?: unknown; content?: unknown };
      if (typeof record.text === "string" && record.text.trim()) {
        hasText = true;
        return;
      }
      if (Array.isArray(record.content)) {
        for (const child of record.content) visit(child);
      }
    };
    visit(parsed);
    return hasText;
  } catch {
    return true;
  }
}

function slugify(name: string, publicId: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/g, "");
  return slug || `community-${publicId.slice(-8).toLowerCase()}`;
}

function encodeCursor(date: Date, id: string): string {
  return Buffer.from(JSON.stringify({ date: date.toISOString(), id }), "utf8").toString(
    "base64url",
  );
}

function decodeCursor(value: string | undefined): { date: Date; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      date?: unknown;
      id?: unknown;
    };
    if (typeof parsed.date !== "string" || typeof parsed.id !== "string") return null;
    const date = new Date(parsed.date);
    return Number.isNaN(date.getTime()) ? null : { date, id: parsed.id };
  } catch {
    return null;
  }
}

type CommunityPostCursor = {
  pinned: boolean;
  date: Date;
  id: string;
};

function encodeCommunityPostCursor(row: {
  pinned: boolean;
  createdAt: Date;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      pinned: row.pinned,
      date: row.createdAt.toISOString(),
      id: row.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeCommunityPostCursor(value: string | undefined): CommunityPostCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      pinned?: unknown;
      date?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.pinned !== "boolean" ||
      typeof parsed.date !== "string" ||
      typeof parsed.id !== "string"
    )
      return null;
    const date = new Date(parsed.date);
    return Number.isNaN(date.getTime())
      ? null
      : { pinned: parsed.pinned, date, id: parsed.id };
  } catch {
    return null;
  }
}

type LearnerFeedCursor = {
  updatedAt: Date;
  createdAt: Date;
  id: string;
};

function encodeLearnerFeedCursor(row: {
  updatedAt: Date;
  createdAt: Date;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      updatedAt: row.updatedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeLearnerFeedCursor(value: string | undefined): LearnerFeedCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      updatedAt?: unknown;
      createdAt?: unknown;
      id?: unknown;
    };
    if (
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.createdAt !== "string" ||
      typeof parsed.id !== "string"
    )
      return null;
    const updatedAt = new Date(parsed.updatedAt);
    const createdAt = new Date(parsed.createdAt);
    return Number.isNaN(updatedAt.getTime()) || Number.isNaN(createdAt.getTime())
      ? null
      : { updatedAt, createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCommunityNameCursor(name: string, id: string): string {
  return Buffer.from(JSON.stringify({ name, id }), "utf8").toString("base64url");
}

function decodeCommunityNameCursor(
  value: string | undefined,
): { name: string; id: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      name?: unknown;
      id?: unknown;
    };
    return typeof parsed.name === "string" && typeof parsed.id === "string"
      ? { name: parsed.name, id: parsed.id }
      : null;
  } catch {
    return null;
  }
}

function identityColumns(identity: Identity) {
  return identity.kind === "learner"
    ? { learnerId: identity.id, adminUserId: null }
    : { learnerId: null, adminUserId: identity.id };
}

function communityToDto(
  row: typeof schema.communities.$inferSelect,
  schoolPublicId: string,
  membership: CommunityMembershipDto | null,
  featuredMedia: CommunityFeaturedMediaDto | null = null,
  membersCount = 0,
  postsCount = 0,
): CommunityDto {
  return {
    id: row.publicId,
    schoolId: schoolPublicId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    banner: row.banner,
    categories: parseCategories(row.categories),
    enabled: row.enabled,
    autoAcceptMembers: row.autoAcceptMembers,
    joiningReasonText: row.joiningReasonText,
    featuredMedia,
    membersCount,
    postsCount,
    deletedAt: row.deletedAt ? serializeDate(row.deletedAt) : null,
    membership,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function membershipToDto(
  row: typeof schema.communityMemberships.$inferSelect,
  learnerPublicId?: string | null,
  communityPublicId?: string,
  member: CommunityActorDto | null = null,
): CommunityMembershipDto {
  return {
    id: row.publicId,
    communityId: communityPublicId ?? row.communityId,
    learnerId: learnerPublicId ?? row.learnerId,
    adminUserId: row.adminUserId,
    member,
    status: row.status,
    role: row.role,
    joiningReason: row.joiningReason,
    rejectionReason: row.rejectionReason,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function communityMediaType(
  kind: MediaKind,
  mimeType: string,
): CommunityMediaDto["type"] {
  if (kind === "image") return "image";
  if (kind === "video") return "video";
  if (kind === "document" && mimeType === "application/pdf") return "pdf";
  throw new Error("unsupported_community_media_kind");
}

function communityMediaToDto(row: typeof schema.media.$inferSelect): CommunityMediaDto {
  return {
    id: row.publicId,
    type: communityMediaType(row.kind, row.mimeType),
    title: row.caption || row.fileName,
    url: row.canonicalUrl,
    thumbnailUrl: row.thumbnailUrl,
    fileName: row.fileName,
    mimeType: row.mimeType,
    byteSize: row.byteSize,
  };
}

function communityFeaturedMediaToDto(
  row: typeof schema.media.$inferSelect,
): CommunityFeaturedMediaDto {
  return {
    id: row.publicId,
    canonicalUrl: row.canonicalUrl,
    thumbnailUrl: row.thumbnailUrl,
    fileName: row.fileName,
    altText: row.altText,
  };
}

async function communityFeaturedMediaMap(
  db: AppDb,
  schoolId: string,
  resourceInternalIds: readonly string[],
): Promise<Map<string, CommunityFeaturedMediaDto>> {
  if (resourceInternalIds.length === 0) return new Map();
  const rows = await db
    .select({ reference: schema.mediaReferences, media: schema.media })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, schoolId),
        eq(schema.mediaReferences.resourceType, "community_artwork"),
        inArray(schema.mediaReferences.resourceInternalId, [...resourceInternalIds]),
        eq(schema.media.status, "active"),
        eq(schema.media.kind, "image"),
      ),
    )
    .orderBy(asc(schema.mediaReferences.createdAt), asc(schema.mediaReferences.id));
  const media = new Map<string, CommunityFeaturedMediaDto>();
  for (const row of rows) {
    if (!media.has(row.reference.resourceInternalId)) {
      media.set(
        row.reference.resourceInternalId,
        communityFeaturedMediaToDto(row.media),
      );
    }
  }
  return media;
}

async function communityFeaturedMediaFor(
  db: AppDb,
  schoolId: string,
  communityInternalId: string,
): Promise<CommunityFeaturedMediaDto | null> {
  return (
    (await communityFeaturedMediaMap(db, schoolId, [communityInternalId])).get(
      communityInternalId,
    ) ?? null
  );
}

async function communityMediaMap(
  db: AppDb,
  schoolId: string,
  resourceInternalIds: readonly string[],
): Promise<Map<string, CommunityMediaDto[]>> {
  if (resourceInternalIds.length === 0) return new Map();
  const rows = await db
    .select({ reference: schema.mediaReferences, media: schema.media })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, schoolId),
        eq(schema.mediaReferences.resourceType, "community_content"),
        inArray(schema.mediaReferences.resourceInternalId, [...resourceInternalIds]),
        eq(schema.media.status, "active"),
        inArray(schema.media.kind, ["image", "video", "document"]),
      ),
    )
    .orderBy(asc(schema.mediaReferences.createdAt), asc(schema.mediaReferences.id));
  const media = new Map<string, CommunityMediaDto[]>();
  for (const row of rows) {
    const items = media.get(row.reference.resourceInternalId) ?? [];
    items.push(communityMediaToDto(row.media));
    media.set(row.reference.resourceInternalId, items);
  }
  return media;
}

async function reconcileCommunityMedia(
  db: AppDb,
  schoolId: string,
  mediaIds: readonly string[],
  resourceInternalId: string,
  resourcePublicId: string,
  clock: Clock,
  parentResourceInternalId: string | null = null,
  parentResourcePublicId: string | null = null,
) {
  return reconcileMediaReferencesInTransaction(
    db,
    schoolId,
    mediaIds,
    "community_content",
    resourceInternalId,
    resourcePublicId,
    clock,
    {
      allowedKinds: ["image", "video", "document"],
      allowedMimeTypes: ["application/pdf"],
      allowedMimePrefixes: ["image/", "video/"],
      parentResourceInternalId,
      parentResourcePublicId,
    },
  );
}

async function clearCommunityMediaReferences(
  db: AppDb,
  schoolId: string,
  resourceInternalIds: readonly string[],
) {
  if (resourceInternalIds.length === 0) return;
  await db
    .delete(schema.mediaReferences)
    .where(
      and(
        eq(schema.mediaReferences.schoolId, schoolId),
        eq(schema.mediaReferences.resourceType, "community_content"),
        inArray(schema.mediaReferences.resourceInternalId, [...resourceInternalIds]),
      ),
    );
}

function postToDto(
  row: typeof schema.communityPosts.$inferSelect,
  learnerPublicId?: string | null,
  communityPublicId?: string,
  media: CommunityMediaDto[] = [],
  reactions: CommunityReactionDto[] = [],
  commentsCount = 0,
  subscribed = false,
  author: CommunityActorDto | null = null,
): CommunityPostDto {
  return {
    id: row.publicId,
    communityId: communityPublicId ?? row.communityId,
    authorId: row.learnerId ? (learnerPublicId ?? row.learnerId) : row.adminUserId,
    authorKind: row.learnerId ? "learner" : row.adminUserId ? "admin" : null,
    author,
    title: row.title,
    content: row.content,
    category: row.category,
    media,
    reactions,
    commentsCount,
    subscribed,
    pinned: row.pinned,
    deletedAt: row.deletedAt ? serializeDate(row.deletedAt) : null,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function commentToDto(
  row: typeof schema.communityComments.$inferSelect,
  learnerPublicId?: string | null,
  communityPublicId?: string,
  postPublicId?: string,
  parentPublicId?: string | null,
  media: CommunityMediaDto[] = [],
  reactions: CommunityReactionDto[] = [],
  author: CommunityActorDto | null = null,
): CommunityCommentDto {
  return {
    id: row.publicId,
    communityId: communityPublicId ?? row.communityId,
    postId: postPublicId ?? row.postId,
    parentCommentId:
      parentPublicId !== undefined ? parentPublicId : row.parentCommentId,
    authorId: row.learnerId ? (learnerPublicId ?? row.learnerId) : row.adminUserId,
    authorKind: row.learnerId ? "learner" : row.adminUserId ? "admin" : null,
    author,
    content: row.deletedAt ? DELETED_COMMUNITY_CONTENT : row.content,
    media,
    reactions,
    deletedAt: row.deletedAt ? serializeDate(row.deletedAt) : null,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function reportToDto(
  row: typeof schema.communityReports.$inferSelect,
  learnerPublicId?: string | null,
  communityPublicId?: string,
  contentPublicId?: string,
  contentParentPublicId?: string | null,
  content: CommunityReportContentDto | null = null,
): CommunityReportDto {
  return {
    id: row.publicId,
    communityId: communityPublicId ?? row.communityId,
    contentType: row.contentType,
    contentId: contentPublicId ?? row.contentId,
    contentParentId:
      contentParentPublicId !== undefined ? contentParentPublicId : row.contentParentId,
    reporterId: row.learnerId ? (learnerPublicId ?? row.learnerId) : row.adminUserId,
    reporterKind: row.learnerId ? "learner" : row.adminUserId ? "admin" : null,
    authorId: content?.authorId ?? null,
    authorKind: content?.authorKind ?? null,
    content,
    reason: row.reason,
    status: row.status,
    rejectionReason: row.rejectionReason,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

type CommunityReportRow = Pick<
  typeof schema.communityReports.$inferSelect,
  "contentType" | "contentId"
>;

async function reportContentMap(
  db: AppDb,
  schoolId: string,
  reports: readonly CommunityReportRow[],
): Promise<Map<string, CommunityReportContentDto>> {
  const postIds = [
    ...new Set(
      reports
        .filter((report) => report.contentType === "post")
        .map((report) => report.contentId),
    ),
  ];
  const commentIds = [
    ...new Set(
      reports
        .filter((report) => report.contentType !== "post")
        .map((report) => report.contentId),
    ),
  ];
  const [posts, comments] = await Promise.all([
    postIds.length > 0
      ? db
          .select()
          .from(schema.communityPosts)
          .where(
            and(
              eq(schema.communityPosts.schoolId, schoolId),
              inArray(schema.communityPosts.id, postIds),
            ),
          )
      : Promise.resolve([]),
    commentIds.length > 0
      ? db
          .select()
          .from(schema.communityComments)
          .where(
            and(
              eq(schema.communityComments.schoolId, schoolId),
              inArray(schema.communityComments.id, commentIds),
            ),
          )
      : Promise.resolve([]),
  ]);
  const media = await communityMediaMap(db, schoolId, [
    ...posts.map((post) => post.id),
    ...comments.map((comment) => comment.id),
  ]);
  const actors = await communityActorMap(
    db,
    [
      ...posts.map((post) => post.learnerId),
      ...comments.map((comment) => comment.learnerId),
    ],
    [
      ...posts.map((post) => post.adminUserId),
      ...comments.map((comment) => comment.adminUserId),
    ],
  );
  const [postAuthors, commentAuthors] = await Promise.all([
    learnerPublicIds(
      db,
      posts.map((post) => post.learnerId),
    ),
    learnerPublicIds(
      db,
      comments.map((comment) => comment.learnerId),
    ),
  ]);
  const postsById = new Map(posts.map((post) => [post.id, post]));
  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));
  const result = new Map<string, CommunityReportContentDto>();
  for (const report of reports) {
    const row =
      report.contentType === "post"
        ? postsById.get(report.contentId)
        : commentsById.get(report.contentId);
    // Moderation history may outlive the reported entity. Once content has
    // been deleted, do not rehydrate its original body or attachments into a
    // report response. The admin UI already treats a missing content payload
    // as "no longer available" while retaining the report itself for audit.
    if (!row || row.deletedAt) continue;
    const authorIds = report.contentType === "post" ? postAuthors : commentAuthors;
    result.set(`${report.contentType}:${report.contentId}`, {
      id: row.publicId,
      content: row.content,
      media: media.get(row.id) ?? [],
      authorId: row.learnerId
        ? (authorIds.get(row.learnerId) ?? null)
        : row.adminUserId,
      authorKind: row.learnerId ? "learner" : row.adminUserId ? "admin" : null,
      author: row.learnerId
        ? (actors.get(`learner:${row.learnerId}`) ?? null)
        : row.adminUserId
          ? (actors.get(`admin:${row.adminUserId}`) ?? null)
          : null,
    });
  }
  return result;
}

async function loadCommunity(db: AppDb, schoolId: string, publicId: string) {
  const rows = await db
    .select()
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.schoolId, schoolId),
        or(
          eq(schema.communities.publicId, publicId),
          eq(schema.communities.slug, publicId),
        ),
        isNull(schema.communities.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function hasActiveDefaultCommunityPlan(
  db: AppDb,
  schoolId: string,
  communityId: string,
) {
  const rows = await db
    .select({ id: schema.communityPaymentPlans.id })
    .from(schema.communityPaymentPlans)
    .where(
      and(
        eq(schema.communityPaymentPlans.schoolId, schoolId),
        eq(schema.communityPaymentPlans.communityId, communityId),
        eq(schema.communityPaymentPlans.status, "active"),
        eq(schema.communityPaymentPlans.isDefault, true),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function activeCommunityMemberCount(
  db: AppDb,
  schoolId: string,
  communityId: string,
): Promise<number> {
  const rows = await db
    .select({ count: count(schema.communityMemberships.id) })
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, schoolId),
        eq(schema.communityMemberships.communityId, communityId),
        eq(schema.communityMemberships.status, "active"),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

async function activeCommunityMemberCountMap(
  db: AppDb,
  schoolId: string,
  communityIds: readonly string[],
): Promise<Map<string, number>> {
  if (communityIds.length === 0) return new Map();
  const rows = await db
    .select({
      communityId: schema.communityMemberships.communityId,
      count: count(schema.communityMemberships.id),
    })
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, schoolId),
        inArray(schema.communityMemberships.communityId, communityIds),
        eq(schema.communityMemberships.status, "active"),
      ),
    )
    .groupBy(schema.communityMemberships.communityId);
  return new Map(rows.map((row) => [row.communityId, Number(row.count)]));
}

async function communityPostCount(
  db: AppDb,
  schoolId: string,
  communityId: string,
): Promise<number> {
  const rows = await db
    .select({ count: count(schema.communityPosts.id) })
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, schoolId),
        eq(schema.communityPosts.communityId, communityId),
        isNull(schema.communityPosts.deletedAt),
      ),
    );
  return Number(rows[0]?.count ?? 0);
}

async function communityPostCountMap(
  db: AppDb,
  schoolId: string,
  communityIds: readonly string[],
): Promise<Map<string, number>> {
  if (communityIds.length === 0) return new Map();
  const rows = await db
    .select({
      communityId: schema.communityPosts.communityId,
      count: count(schema.communityPosts.id),
    })
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, schoolId),
        inArray(schema.communityPosts.communityId, communityIds),
        isNull(schema.communityPosts.deletedAt),
      ),
    )
    .groupBy(schema.communityPosts.communityId);
  return new Map(rows.map((row) => [row.communityId, Number(row.count)]));
}

async function isLastActiveModerator(
  db: AppDb,
  schoolId: string,
  communityId: string,
  membership: typeof schema.communityMemberships.$inferSelect,
  next: { status: string; role: string },
) {
  if (
    membership.status !== "active" ||
    membership.role !== "moderator" ||
    (next.status === "active" && next.role === "moderator")
  ) {
    return false;
  }
  const moderators = await db
    .select({ count: count(schema.communityMemberships.id) })
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, schoolId),
        eq(schema.communityMemberships.communityId, communityId),
        eq(schema.communityMemberships.status, "active"),
        eq(schema.communityMemberships.role, "moderator"),
      ),
    );
  return Number(moderators[0]?.count ?? 0) <= 1;
}

async function publicCommunityId(
  db: AppDb,
  communityId: string,
): Promise<string | null> {
  const rows = await db
    .select({ publicId: schema.communities.publicId })
    .from(schema.communities)
    .where(eq(schema.communities.id, communityId))
    .limit(1);
  return rows[0]?.publicId ?? null;
}

async function publicContentId(
  db: AppDb,
  contentType: "post" | "comment" | "reply",
  contentId: string,
): Promise<string | null> {
  if (contentType === "post") {
    const rows = await db
      .select({ publicId: schema.communityPosts.publicId })
      .from(schema.communityPosts)
      .where(eq(schema.communityPosts.id, contentId))
      .limit(1);
    return rows[0]?.publicId ?? null;
  }
  const rows = await db
    .select({ publicId: schema.communityComments.publicId })
    .from(schema.communityComments)
    .where(eq(schema.communityComments.id, contentId))
    .limit(1);
  return rows[0]?.publicId ?? null;
}

async function loadMembership(
  db: AppDb,
  schoolId: string,
  communityId: string,
  identity: Identity,
) {
  const columns = identityColumns(identity);
  const rows = await db
    .select()
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, schoolId),
        eq(schema.communityMemberships.communityId, communityId),
        identity.kind === "learner"
          ? eq(schema.communityMemberships.learnerId, columns.learnerId!)
          : eq(schema.communityMemberships.adminUserId, columns.adminUserId!),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function canReadCommunity(
  db: AppDb,
  schoolId: string,
  communityId: string,
  viewer: CommunityViewer,
) {
  if (viewer.kind === "admin") {
    return adminCan(viewer.context, "communities:read");
  }
  const membership = await loadMembership(db, schoolId, communityId, {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  });
  return membership?.status === "active";
}

async function canWriteCommunity(
  db: AppDb,
  schoolId: string,
  communityId: string,
  viewer: CommunityViewer,
) {
  if (viewer.kind === "admin") {
    return adminCan(viewer.context, "communities:write");
  }
  const membership = await loadMembership(db, schoolId, communityId, {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  });
  return membership?.status === "active";
}

async function canModerateCommunity(
  db: AppDb,
  schoolId: string,
  communityId: string,
  viewer: CommunityViewer,
) {
  if (viewer.kind === "admin") {
    return adminCan(viewer.context, "communities:moderate");
  }
  const membership = await loadMembership(db, schoolId, communityId, {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  });
  return (
    membership?.status === "active" &&
    (membership.role === "moderator" || membership.role === "owner")
  );
}

async function learnerPublicIds(db: AppDb, ids: (string | null)[]) {
  const internalIds = ids.filter((id): id is string => Boolean(id));
  if (internalIds.length === 0) return new Map<string, string>();
  const rows = await db
    .select({ id: schema.learners.id, publicId: schema.learners.publicId })
    .from(schema.learners)
    .where(inArray(schema.learners.id, internalIds));
  return new Map(rows.map((row) => [row.id, row.publicId]));
}

async function communityActorMap(
  db: AppDb,
  learnerIds: readonly (string | null)[],
  adminIds: readonly (string | null)[],
): Promise<Map<string, CommunityActorDto>> {
  const learnerInternalIds = [
    ...new Set(learnerIds.filter((id): id is string => Boolean(id))),
  ];
  const adminUserIds = [...new Set(adminIds.filter((id): id is string => Boolean(id)))];
  const [learnerRows, adminRows] = await Promise.all([
    learnerInternalIds.length > 0
      ? db
          .select({
            id: schema.learners.id,
            publicId: schema.learners.publicId,
            name: schema.learners.name,
            email: schema.learners.email,
          })
          .from(schema.learners)
          .where(inArray(schema.learners.id, learnerInternalIds))
      : Promise.resolve([]),
    adminUserIds.length > 0
      ? db
          .select({
            id: schema.user.id,
            name: schema.user.name,
            email: schema.user.email,
            imageUrl: schema.user.image,
          })
          .from(schema.user)
          .where(inArray(schema.user.id, adminUserIds))
      : Promise.resolve([]),
  ]);
  const actors = new Map<string, CommunityActorDto>();
  for (const row of learnerRows) {
    actors.set(`learner:${row.id}`, {
      id: row.publicId,
      kind: "learner",
      name: row.name,
      email: row.email,
      imageUrl: null,
    });
  }
  for (const row of adminRows) {
    actors.set(`admin:${row.id}`, {
      id: row.id,
      kind: "admin",
      name: row.name,
      email: row.email,
      imageUrl: row.imageUrl,
    });
  }
  return actors;
}

async function communityReactionMap(
  db: AppDb,
  schoolId: string,
  communityId: string,
  entityType: "post" | "comment" | "reply",
  entityIds: readonly string[],
  viewer: CommunityViewer,
): Promise<Map<string, CommunityReactionDto[]>> {
  if (entityIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(schema.communityReactions)
    .where(
      and(
        eq(schema.communityReactions.schoolId, schoolId),
        eq(schema.communityReactions.communityId, communityId),
        eq(schema.communityReactions.entityType, entityType),
        inArray(schema.communityReactions.entityId, [...entityIds]),
      ),
    );
  const viewerLearnerId = viewer.kind === "learner" ? viewer.learnerId : null;
  const grouped = new Map<string, Map<string, CommunityReactionDto>>();
  for (const row of rows) {
    const byEmoji = grouped.get(row.entityId) ?? new Map();
    const reaction = byEmoji.get(row.emoji) ?? {
      emoji: row.emoji,
      count: 0,
      active: false,
    };
    reaction.count += 1;
    if (viewerLearnerId && row.learnerId === viewerLearnerId) reaction.active = true;
    byEmoji.set(row.emoji, reaction);
    grouped.set(row.entityId, byEmoji);
  }
  return new Map(
    [...grouped].map(([entityId, byEmoji]) => [
      entityId,
      [...byEmoji.values()].sort(
        (left, right) =>
          EMOJIS.indexOf(left.emoji as CommunityEmoji) -
          EMOJIS.indexOf(right.emoji as CommunityEmoji),
      ),
    ]),
  );
}

async function communityCommentCountMap(
  db: AppDb,
  schoolId: string,
  postIds: readonly string[],
) {
  if (postIds.length === 0) return new Map<string, number>();
  const rows = await db
    .select({
      postId: schema.communityComments.postId,
      count: count(schema.communityComments.id),
    })
    .from(schema.communityComments)
    .where(
      and(
        eq(schema.communityComments.schoolId, schoolId),
        inArray(schema.communityComments.postId, [...postIds]),
        isNull(schema.communityComments.deletedAt),
      ),
    )
    .groupBy(schema.communityComments.postId);
  return new Map(rows.map((row) => [row.postId, Number(row.count)]));
}

async function communityPostSubscriptionSet(
  db: AppDb,
  schoolId: string,
  postIds: readonly string[],
  viewer: CommunityViewer,
): Promise<Set<string>> {
  if (postIds.length === 0 || viewer.kind !== "learner") return new Set();
  const rows = await db
    .select({ postId: schema.communityPostSubscribers.postId })
    .from(schema.communityPostSubscribers)
    .where(
      and(
        eq(schema.communityPostSubscribers.schoolId, schoolId),
        eq(schema.communityPostSubscribers.learnerId, viewer.learnerId),
        inArray(schema.communityPostSubscribers.postId, [...postIds]),
      ),
    );
  return new Set(rows.map((row) => row.postId));
}

export async function listCommunities(
  db: AppDb,
  context: AdminContext,
  publicSchoolId: string,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: CommunityDto[]; nextCursor: string | null }>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:read")) return forbidden();
  const cursor = decodeCommunityNameCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communities.schoolId, school.schoolId),
    isNull(schema.communities.deletedAt),
  ];
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communities.name, cursor.name),
        and(
          eq(schema.communities.name, cursor.name),
          gt(schema.communities.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.communities)
    .where(and(...conditions))
    .orderBy(asc(schema.communities.name), asc(schema.communities.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const featuredMedia = await communityFeaturedMediaMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  const membersCount = await activeCommunityMemberCountMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  const postsCount = await communityPostCountMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  return {
    ok: true,
    value: {
      items: page.map((row) =>
        communityToDto(
          row,
          publicSchoolId,
          null,
          featuredMedia.get(row.id) ?? null,
          membersCount.get(row.id) ?? 0,
          postsCount.get(row.id) ?? 0,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCommunityNameCursor(page.at(-1)!.name, page.at(-1)!.id)
          : null,
    },
  };
}

export async function listLearnerCommunities(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: CommunityDto[]; nextCursor: string | null }>> {
  const cursor = decodeCommunityNameCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communityMemberships.schoolId, viewer.schoolId),
    eq(schema.communityMemberships.learnerId, viewer.learnerId),
    isNull(schema.communities.deletedAt),
  ];
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communities.name, cursor.name),
        and(
          eq(schema.communities.name, cursor.name),
          gt(schema.communities.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select({ community: schema.communities, membership: schema.communityMemberships })
    .from(schema.communityMemberships)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityMemberships.communityId),
    )
    .where(and(...conditions))
    .orderBy(asc(schema.communities.name), asc(schema.communities.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const featuredMedia = await communityFeaturedMediaMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  const membersCount = await activeCommunityMemberCountMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  const postsCount = await communityPostCountMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  return {
    ok: true,
    value: {
      items: page.map((row) =>
        communityToDto(
          row.community,
          viewer.schoolPublicId,
          membershipToDto(
            row.membership,
            viewer.learnerPublicId,
            row.community.publicId,
          ),
          featuredMedia.get(row.community.id) ?? null,
          membersCount.get(row.community.id) ?? 0,
          postsCount.get(row.community.id) ?? 0,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCommunityNameCursor(
              page.at(-1)!.community.name,
              page.at(-1)!.community.id,
            )
          : null,
    },
  };
}

export async function listLearnerFeed(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: LearnerFeedPostDto[]; nextCursor: string | null }>> {
  const cursor = decodeLearnerFeedCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communityPosts.schoolId, viewer.schoolId),
    isNull(schema.communityPosts.deletedAt),
    eq(schema.communities.schoolId, viewer.schoolId),
    eq(schema.communities.enabled, true),
    isNull(schema.communities.deletedAt),
    eq(schema.communityMemberships.schoolId, viewer.schoolId),
    eq(schema.communityMemberships.learnerId, viewer.learnerId),
    eq(schema.communityMemberships.status, "active"),
  ];
  if (cursor) {
    conditions.push(
      or(
        lt(schema.communityPosts.updatedAt, cursor.updatedAt),
        and(
          eq(schema.communityPosts.updatedAt, cursor.updatedAt),
          or(
            lt(schema.communityPosts.createdAt, cursor.createdAt),
            and(
              eq(schema.communityPosts.createdAt, cursor.createdAt),
              lt(schema.communityPosts.id, cursor.id),
            ),
          ),
        ),
      )!,
    );
  }
  const rows = await db
    .select({
      post: schema.communityPosts,
      community: {
        id: schema.communities.id,
        publicId: schema.communities.publicId,
        name: schema.communities.name,
        slug: schema.communities.slug,
      },
    })
    .from(schema.communityPosts)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityPosts.communityId),
    )
    .innerJoin(
      schema.communityMemberships,
      and(
        eq(schema.communityMemberships.communityId, schema.communities.id),
        eq(schema.communityMemberships.learnerId, viewer.learnerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(
      desc(schema.communityPosts.updatedAt),
      desc(schema.communityPosts.createdAt),
      desc(schema.communityPosts.id),
    )
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const postRows = page.map((row) => row.post);
  const learnerIds = await resolveLearnerMapForPosts(db, postRows);
  const actors = await communityActorMap(
    db,
    postRows.map((row) => row.learnerId),
    postRows.map((row) => row.adminUserId),
  );
  const media = await communityMediaMap(
    db,
    viewer.schoolId,
    postRows.map((row) => row.id),
  );
  const commentsCount = await communityCommentCountMap(
    db,
    viewer.schoolId,
    postRows.map((row) => row.id),
  );
  const subscriptions = await communityPostSubscriptionSet(
    db,
    viewer.schoolId,
    postRows.map((row) => row.id),
    viewer,
  );
  const reactionMaps = await Promise.all(
    [...new Set(page.map((row) => row.community.id))].map(async (communityId) => {
      const postIds = page
        .filter((row) => row.community.id === communityId)
        .map((row) => row.post.id);
      return [
        communityId,
        await communityReactionMap(
          db,
          viewer.schoolId,
          communityId,
          "post",
          postIds,
          viewer,
        ),
      ] as const;
    }),
  );
  const reactions = new Map(reactionMaps);

  return {
    ok: true,
    value: {
      items: page.map((row) => {
        const author = row.post.learnerId
          ? (actors.get(`learner:${row.post.learnerId}`) ?? null)
          : row.post.adminUserId
            ? (actors.get(`admin:${row.post.adminUserId}`) ?? null)
            : null;
        const post = postToDto(
          row.post,
          row.post.learnerId ? learnerIds.get(row.post.learnerId) : null,
          row.community.publicId,
          media.get(row.post.id) ?? [],
          reactions.get(row.community.id)?.get(row.post.id) ?? [],
          commentsCount.get(row.post.id) ?? 0,
          subscriptions.has(row.post.id),
          author,
        );
        return {
          ...post,
          community: {
            id: row.community.publicId,
            name: row.community.name,
            slug: row.community.slug,
          },
        };
      }),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeLearnerFeedCursor(page.at(-1)!.post)
          : null,
    },
  };
}

/**
 * Public community catalog. Membership and participation remain learner-only;
 * this operation only exposes enabled, non-deleted communities for the public
 * school site.
 */
export async function listPublicCommunities(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: CommunityDto[]; nextCursor: string | null }>> {
  const cursor = decodeCommunityNameCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communities.schoolId, school.schoolId),
    eq(schema.communities.enabled, true),
    isNull(schema.communities.deletedAt),
  ];
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communities.name, cursor.name),
        and(
          eq(schema.communities.name, cursor.name),
          gt(schema.communities.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.communities)
    .where(and(...conditions))
    .orderBy(asc(schema.communities.name), asc(schema.communities.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const communityIds = page.map((row) => row.id);
  const [featuredMedia, membersCount, postsCount] = await Promise.all([
    communityFeaturedMediaMap(db, school.schoolId, communityIds),
    activeCommunityMemberCountMap(db, school.schoolId, communityIds),
    communityPostCountMap(db, school.schoolId, communityIds),
  ]);

  return {
    ok: true,
    value: {
      items: page.map((row) =>
        communityToDto(
          row,
          school.publicId,
          null,
          featuredMedia.get(row.id) ?? null,
          membersCount.get(row.id) ?? 0,
          postsCount.get(row.id) ?? 0,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCommunityNameCursor(page.at(-1)!.name, page.at(-1)!.id)
          : null,
    },
  };
}

/**
 * Reads one enabled community for the public school site. Membership and
 * participation remain learner-only; the public response is deliberately
 * discovery metadata with no viewer membership state.
 */
export async function getPublicCommunity(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
): Promise<Result<CommunityDto>> {
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community?.enabled || community.deletedAt) return notFound();

  const [featuredMedia, membersCount, postsCount] = await Promise.all([
    communityFeaturedMediaFor(db, school.schoolId, community.id),
    activeCommunityMemberCount(db, school.schoolId, community.id),
    communityPostCount(db, school.schoolId, community.id),
  ]);

  return {
    ok: true,
    value: communityToDto(
      community,
      school.publicId,
      null,
      featuredMedia,
      membersCount,
      postsCount,
    ),
  };
}

export async function listAvailableLearnerCommunities(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: CommunityDto[]; nextCursor: string | null }>> {
  const cursor = decodeCommunityNameCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communities.schoolId, viewer.schoolId),
    eq(schema.communities.enabled, true),
    isNull(schema.communities.deletedAt),
  ];
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communities.name, cursor.name),
        and(
          eq(schema.communities.name, cursor.name),
          gt(schema.communities.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select({ community: schema.communities, membership: schema.communityMemberships })
    .from(schema.communities)
    .leftJoin(
      schema.communityMemberships,
      and(
        eq(schema.communityMemberships.communityId, schema.communities.id),
        eq(schema.communityMemberships.learnerId, viewer.learnerId),
      ),
    )
    .where(and(...conditions))
    .orderBy(asc(schema.communities.name), asc(schema.communities.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const featuredMedia = await communityFeaturedMediaMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  const membersCount = await activeCommunityMemberCountMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  const postsCount = await communityPostCountMap(
    db,
    viewer.schoolId,
    page.map((row) => row.community.id),
  );
  return {
    ok: true,
    value: {
      items: page.map((row) =>
        communityToDto(
          row.community,
          viewer.schoolPublicId,
          row.membership
            ? membershipToDto(
                row.membership,
                viewer.learnerPublicId,
                row.community.publicId,
              )
            : null,
          featuredMedia.get(row.community.id) ?? null,
          membersCount.get(row.community.id) ?? 0,
          postsCount.get(row.community.id) ?? 0,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCommunityNameCursor(
              page.at(-1)!.community.name,
              page.at(-1)!.community.id,
            )
          : null,
    },
  };
}

export async function createCommunity(
  db: AppDb,
  context: AdminContext,
  publicSchoolId: string,
  input: {
    name: string;
    slug?: string;
    description: string;
    banner: string;
    categories: string[];
    enabled: boolean;
    autoAcceptMembers: boolean;
    joiningReasonText: string;
  },
  clock: Clock,
): Promise<Result<CommunityDto>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:write")) return forbidden();
  const name = input.name.trim();
  const categories = input.categories.map((item) => item.trim()).filter(Boolean);
  if (!name || name.length > 200 || categories.length === 0) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  if (input.enabled) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "community_requires_default_payment_plan" },
      }),
    };
  }
  const publicId = createPublicId("com", clock);
  const slug = input.slug?.trim() || slugify(name, publicId);
  const now = clock.now();
  try {
    return await db.transaction(async (tx) => {
      const row = {
        id: uuidv7(clock),
        publicId,
        schoolId: school.schoolId,
        name,
        slug,
        description: input.description,
        banner: input.banner,
        categories: JSON.stringify(categories),
        enabled: input.enabled,
        autoAcceptMembers: input.autoAcceptMembers,
        joiningReasonText: input.joiningReasonText,
        deletedAt: null,
        createdBy: context.principalId,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(schema.communities).values(row);
      await createPendingSalesPage(tx as AppDb, {
        id: uuidv7(clock),
        schoolId: row.schoolId,
        resourceType: "community",
        resourceId: row.id,
        resourcePublicId: row.publicId,
        now,
      });
      const contentMediaIds = [
        ...(await mediaIdsForRichTextContent(
          tx as AppDb,
          school.schoolId,
          input.description,
        )),
        ...(await mediaIdsForRichTextContent(
          tx as AppDb,
          school.schoolId,
          input.banner,
        )),
      ];
      const contentReferences = await reconcileMediaReferencesInTransaction(
        tx as AppDb,
        school.schoolId,
        [...new Set(contentMediaIds)],
        "community_content",
        row.id,
        row.publicId,
        clock,
      );
      if (!contentReferences.ok) return contentReferences;
      const membership = {
        id: uuidv7(clock),
        publicId: createPublicId("cmm", clock),
        schoolId: school.schoolId,
        communityId: row.id,
        learnerId: null,
        adminUserId: context.principalId,
        paymentPlanId: null,
        status: "active" as const,
        role: "owner" as const,
        joiningReason: "",
        rejectionReason: null,
        createdAt: now,
        updatedAt: now,
      };
      await tx.insert(schema.communityMemberships).values(membership);
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: school.schoolId,
        actorId: context.principalId,
        action: "community.created",
        resourceType: "community",
        resourceId: publicId,
        requestId: context.requestId,
        createdAt: now,
      });
      return {
        ok: true as const,
        value: communityToDto(
          row,
          publicSchoolId,
          membershipToDto(membership, null, publicId),
          null,
          1,
        ),
      };
    });
  } catch (error) {
    if (String(error).includes("communities_school_slug_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "slug_taken" },
        }),
      };
    }
    throw error;
  }
}

export async function getCommunity(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  publicId: string,
  viewer: CommunityViewer,
): Promise<Result<CommunityDto>> {
  const row = await loadCommunity(db, school.schoolId, publicId);
  if (!row) return notFound();
  if (viewer.kind === "admin" && !adminCan(viewer.context, "communities:read")) {
    return forbidden();
  }
  if (viewer.kind === "learner" && !row.enabled) return notFound();
  const identity: Identity =
    viewer.kind === "learner"
      ? { kind: "learner", id: viewer.learnerId, publicId: viewer.learnerPublicId }
      : {
          kind: "admin",
          id: viewer.context.principalId,
          publicId: viewer.context.principalId,
        };
  const membership = await loadMembership(db, school.schoolId, row.id, identity);
  const membersCount = await activeCommunityMemberCount(db, school.schoolId, row.id);
  const postsCount = await communityPostCount(db, school.schoolId, row.id);
  return {
    ok: true,
    value: communityToDto(
      row,
      school.publicId,
      membership
        ? membershipToDto(
            membership,
            viewer.kind === "learner" ? viewer.learnerPublicId : null,
            publicId,
          )
        : null,
      await communityFeaturedMediaFor(db, school.schoolId, row.id),
      membersCount,
      postsCount,
    ),
  };
}

export async function updateCommunity(
  db: AppDb,
  context: AdminContext,
  publicSchoolId: string,
  publicId: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    banner?: string;
    categories?: string[];
    enabled?: boolean;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
    featuredMediaId?: string | null;
  },
  clock: Clock,
): Promise<Result<CommunityDto>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:write")) return forbidden();
  const existing = await loadCommunity(db, school.schoolId, publicId);
  if (!existing) return notFound();
  const categories = input.categories?.map((item) => item.trim()).filter(Boolean);
  if (input.name !== undefined && !input.name.trim()) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  if (categories && categories.length === 0) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  if (
    input.enabled === true &&
    !(await hasActiveDefaultCommunityPlan(db, school.schoolId, existing.id))
  ) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "community_requires_default_payment_plan" },
      }),
    };
  }
  const now = clock.now();
  try {
    return await db.transaction(async (tx) => {
      const next = {
        name: input.name?.trim() ?? existing.name,
        slug: input.slug?.trim() ?? existing.slug,
        description: input.description ?? existing.description,
        banner: input.banner ?? existing.banner,
        categories: categories ? JSON.stringify(categories) : existing.categories,
        enabled: input.enabled ?? existing.enabled,
        autoAcceptMembers: input.autoAcceptMembers ?? existing.autoAcceptMembers,
        joiningReasonText: input.joiningReasonText ?? existing.joiningReasonText,
        updatedAt: now,
      };
      if (input.description !== undefined || input.banner !== undefined) {
        const contentMediaIds = [
          ...(await mediaIdsForRichTextContent(
            tx as AppDb,
            school.schoolId,
            next.description,
          )),
          ...(await mediaIdsForRichTextContent(
            tx as AppDb,
            school.schoolId,
            next.banner,
          )),
        ];
        const contentReferences = await reconcileMediaReferencesInTransaction(
          tx as AppDb,
          school.schoolId,
          [...new Set(contentMediaIds)],
          "community_content",
          existing.id,
          existing.publicId,
          clock,
        );
        if (!contentReferences.ok) return contentReferences;
      }
      let featuredMedia: CommunityFeaturedMediaDto | null;
      if (input.featuredMediaId !== undefined) {
        let selectedMedia: typeof schema.media.$inferSelect | null = null;
        if (input.featuredMediaId) {
          const rows = await tx
            .select()
            .from(schema.media)
            .where(
              and(
                eq(schema.media.publicId, input.featuredMediaId),
                eq(schema.media.schoolId, school.schoolId),
                eq(schema.media.status, "active"),
                eq(schema.media.kind, "image"),
              ),
            )
            .limit(1);
          selectedMedia = rows[0] ?? null;
          if (!selectedMedia) return notFound();
        }
        await tx
          .delete(schema.mediaReferences)
          .where(
            and(
              eq(schema.mediaReferences.schoolId, school.schoolId),
              eq(schema.mediaReferences.resourceType, "community_artwork"),
              eq(schema.mediaReferences.resourceInternalId, existing.id),
            ),
          );
        if (selectedMedia) {
          await tx.insert(schema.mediaReferences).values({
            id: uuidv7(clock),
            schoolId: school.schoolId,
            mediaId: selectedMedia.id,
            resourceType: "community_artwork",
            resourceInternalId: existing.id,
            resourcePublicId: existing.publicId,
            parentResourceInternalId: null,
            parentResourcePublicId: null,
            createdAt: now,
            updatedAt: now,
          });
        }
        featuredMedia = selectedMedia
          ? communityFeaturedMediaToDto(selectedMedia)
          : null;
      } else {
        featuredMedia = await communityFeaturedMediaFor(
          tx as AppDb,
          school.schoolId,
          existing.id,
        );
      }
      await tx
        .update(schema.communities)
        .set(next)
        .where(eq(schema.communities.id, existing.id));
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: school.schoolId,
        actorId: context.principalId,
        action: "community.updated",
        resourceType: "community",
        resourceId: publicId,
        requestId: context.requestId,
        createdAt: now,
      });
      const membersCount = await activeCommunityMemberCount(
        tx as unknown as AppDb,
        school.schoolId,
        existing.id,
      );
      const postsCount = await communityPostCount(
        tx as unknown as AppDb,
        school.schoolId,
        existing.id,
      );
      return {
        ok: true as const,
        value: communityToDto(
          { ...existing, ...next },
          publicSchoolId,
          null,
          featuredMedia,
          membersCount,
          postsCount,
        ),
      };
    });
  } catch (error) {
    if (String(error).includes("communities_school_slug_uidx")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "slug_taken" },
        }),
      };
    }
    throw error;
  }
}

export async function addCommunityCategory(
  db: AppDb,
  context: AdminContext,
  publicSchoolId: string,
  publicId: string,
  category: string,
  clock: Clock,
): Promise<Result<CommunityDto>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:write")) return forbidden();
  const existing = await loadCommunity(db, school.schoolId, publicId);
  if (!existing) return notFound();
  const normalizedCategory = category.trim();
  if (!normalizedCategory || normalizedCategory.length > 100) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const categories = parseCategories(existing.categories);
  if (categories.includes(normalizedCategory)) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "category_exists" },
      }),
    };
  }

  const now = clock.now();
  const next = {
    categories: JSON.stringify([...categories, normalizedCategory]),
    updatedAt: now,
  };
  await db
    .update(schema.communities)
    .set(next)
    .where(eq(schema.communities.id, existing.id));
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: school.schoolId,
    actorId: context.principalId,
    action: "community.category_added",
    resourceType: "community",
    resourceId: publicId,
    requestId: context.requestId,
    createdAt: now,
  });
  const membersCount = await activeCommunityMemberCount(
    db,
    school.schoolId,
    existing.id,
  );
  const postsCount = await communityPostCount(db, school.schoolId, existing.id);
  return {
    ok: true,
    value: communityToDto(
      { ...existing, ...next },
      publicSchoolId,
      null,
      await communityFeaturedMediaFor(db, school.schoolId, existing.id),
      membersCount,
      postsCount,
    ),
  };
}

export async function deleteCommunityCategory(
  db: AppDb,
  context: AdminContext,
  publicSchoolId: string,
  publicId: string,
  category: string,
  migrateToCategory: string | null | undefined,
  clock: Clock,
): Promise<Result<CommunityDto>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:write")) return forbidden();
  const existing = await loadCommunity(db, school.schoolId, publicId);
  if (!existing) return notFound();

  const normalizedCategory = category.trim();
  const categories = parseCategories(existing.categories);
  if (!categories.includes(normalizedCategory)) return notFound();
  if (categories.length === 1) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "community_requires_one_category" },
      }),
    };
  }

  const normalizedMigration = migrateToCategory?.trim() || null;
  if (
    normalizedMigration &&
    (normalizedMigration === normalizedCategory ||
      !categories.includes(normalizedMigration))
  ) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_category_migration_target" },
      }),
    };
  }

  const [{ postCount }] = await db
    .select({ postCount: count(schema.communityPosts.id) })
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, school.schoolId),
        eq(schema.communityPosts.communityId, existing.id),
        eq(schema.communityPosts.category, normalizedCategory),
      ),
    );
  if (Number(postCount) > 0 && !normalizedMigration) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "category_migration_required" },
      }),
    };
  }

  const now = clock.now();
  const nextCategories = categories.filter((item) => item !== normalizedCategory);
  const next = {
    categories: JSON.stringify(nextCategories),
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    if (normalizedMigration) {
      await tx
        .update(schema.communityPosts)
        .set({ category: normalizedMigration, updatedAt: now })
        .where(
          and(
            eq(schema.communityPosts.schoolId, school.schoolId),
            eq(schema.communityPosts.communityId, existing.id),
            eq(schema.communityPosts.category, normalizedCategory),
          ),
        );
    }
    await tx
      .update(schema.communities)
      .set(next)
      .where(eq(schema.communities.id, existing.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: school.schoolId,
      actorId: context.principalId,
      action: "community.category_deleted",
      resourceType: "community",
      resourceId: publicId,
      requestId: context.requestId,
      createdAt: now,
    });
  });
  const membersCount = await activeCommunityMemberCount(
    db,
    school.schoolId,
    existing.id,
  );
  const postsCount = await communityPostCount(db, school.schoolId, existing.id);
  return {
    ok: true,
    value: communityToDto(
      { ...existing, ...next },
      publicSchoolId,
      null,
      await communityFeaturedMediaFor(db, school.schoolId, existing.id),
      membersCount,
      postsCount,
    ),
  };
}

export async function deleteCommunity(
  db: AppDb,
  context: AdminContext,
  publicId: string,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:write")) return forbidden();
  const existing = await loadCommunity(db, school.schoolId, publicId);
  if (!existing) return notFound();
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.communities)
      .set({ deletedAt: now, enabled: false, updatedAt: now })
      .where(eq(schema.communities.id, existing.id));
    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, school.schoolId),
          eq(schema.mediaReferences.resourceType, "community_artwork"),
          eq(schema.mediaReferences.resourceInternalId, existing.id),
        ),
      );
    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, school.schoolId),
          eq(schema.mediaReferences.resourceType, "community_content"),
          eq(schema.mediaReferences.resourceInternalId, existing.id),
        ),
      );
    await tx
      .delete(schema.frontlitSalesPages)
      .where(
        and(
          eq(schema.frontlitSalesPages.schoolId, school.schoolId),
          eq(schema.frontlitSalesPages.resourceType, "community"),
          eq(schema.frontlitSalesPages.resourceId, existing.id),
        ),
      );
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: school.schoolId,
      actorId: context.principalId,
      action: "community.deleted",
      resourceType: "community",
      resourceId: publicId,
      requestId: context.requestId,
      createdAt: now,
    });
  });
  return { ok: true, value: { id: publicId } };
}

export async function joinCommunity(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  communityPublicId: string,
  joiningReason: string,
  clock: Clock,
): Promise<Result<CommunityMembershipDto>> {
  const community = await loadCommunity(db, viewer.schoolId, communityPublicId);
  if (!community?.enabled) return notFound();
  const activePlans = await db
    .select({
      id: schema.communityPaymentPlans.id,
      kind: schema.communityPaymentPlans.kind,
      isDefault: schema.communityPaymentPlans.isDefault,
    })
    .from(schema.communityPaymentPlans)
    .where(
      and(
        eq(schema.communityPaymentPlans.schoolId, viewer.schoolId),
        eq(schema.communityPaymentPlans.communityId, community.id),
        eq(schema.communityPaymentPlans.status, "active"),
      ),
    );
  if (activePlans.length === 0) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "community_has_no_payment_plans" },
      }),
    };
  }
  const freePlan =
    activePlans.find((plan) => plan.kind === "free" && plan.isDefault) ??
    activePlans.find((plan) => plan.kind === "free");
  if (!freePlan) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "community_requires_payment" },
      }),
    };
  }
  const normalizedJoiningReason = joiningReason.trim();
  if (!community.autoAcceptMembers && !normalizedJoiningReason) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "joining_reason_required" },
      }),
    };
  }
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const existing = await loadMembership(db, viewer.schoolId, community.id, identity);
  if (existing) {
    return {
      ok: true,
      value: membershipToDto(existing, viewer.learnerPublicId, communityPublicId),
    };
  }
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("cmm", clock),
    schoolId: viewer.schoolId,
    communityId: community.id,
    paymentPlanId: freePlan.id,
    learnerId: viewer.learnerId,
    adminUserId: null,
    status: community.autoAcceptMembers ? ("active" as const) : ("pending" as const),
    role: "member" as const,
    joiningReason: normalizedJoiningReason,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.communityMemberships).values(row);
  await recordActivity(db, {
    schoolId: viewer.schoolId,
    actorId: viewer.learnerId,
    type: ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED,
    entityId: community.publicId,
    metadata: { membershipId: row.publicId },
  }, clock);
  if (row.status === "active") {
    await recordActivity(db, {
      schoolId: viewer.schoolId,
      actorId: viewer.learnerId,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: community.publicId,
      metadata: { membershipId: row.publicId },
    }, clock);
  }
  return {
    ok: true,
    value: membershipToDto(row, viewer.learnerPublicId, communityPublicId),
  };
}

export async function leaveCommunity(
  db: AppDb,
  viewer: CommunityLearnerViewer,
  communityPublicId: string,
  clock: Clock,
  requestId: string,
  paymentProviderOverride?: PaymentProvider,
): Promise<Result<{ left: boolean }>> {
  const community = await loadCommunity(db, viewer.schoolId, communityPublicId);
  if (!community) return notFound();

  const membership = await loadMembership(db, viewer.schoolId, community.id, {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  });
  if (membership?.status !== "active") {
    return { ok: true, value: { left: true } };
  }
  if (membership.adminUserId) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "cannot_leave_linked_admin_membership" },
      }),
    };
  }

  if (membership.role === "moderator") {
    const moderators = await db
      .select({ id: schema.communityMemberships.id })
      .from(schema.communityMemberships)
      .where(
        and(
          eq(schema.communityMemberships.schoolId, viewer.schoolId),
          eq(schema.communityMemberships.communityId, community.id),
          eq(schema.communityMemberships.status, "active"),
          eq(schema.communityMemberships.role, "moderator"),
        ),
      );
    if (moderators.length === 1) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "cannot_leave_last_moderator" },
        }),
      };
    }
  }

  const subscriptions = await db
    .select({ subscription: schema.communitySubscriptions })
    .from(schema.communitySubscriptions)
    .innerJoin(
      schema.communityCheckoutAttempts,
      eq(schema.communityCheckoutAttempts.id, schema.communitySubscriptions.checkoutId),
    )
    .where(
      and(
        eq(schema.communitySubscriptions.status, "active"),
        eq(schema.communityCheckoutAttempts.schoolId, viewer.schoolId),
        eq(schema.communityCheckoutAttempts.communityId, community.id),
        eq(schema.communityCheckoutAttempts.learnerId, viewer.learnerId),
      ),
    );
  if (subscriptions.length > 0) {
    const paymentProvider = await getPaymentProvider(db, viewer.schoolId, paymentProviderOverride);
    if (!paymentProvider?.cancelSubscription) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "provider_unavailable" },
        }),
      };
    }
    try {
      for (const row of subscriptions) {
        await paymentProvider.cancelSubscription(row.subscription.providerSubscriptionId);
      }
    } catch {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "provider_unavailable" },
        }),
      };
    }
  }

  const now = clock.now();
  await db.transaction(async (tx) => {
    await revokeCommunityMembershipAccess(
      tx as unknown as AppDb,
      {
        schoolId: viewer.schoolId,
        learnerId: viewer.learnerId,
        paymentPlanId: membership.paymentPlanId,
      },
      clock,
    );
    await tx
      .delete(schema.communityMemberships)
      .where(
        and(
          eq(schema.communityMemberships.id, membership.id),
          eq(schema.communityMemberships.schoolId, viewer.schoolId),
          eq(schema.communityMemberships.learnerId, viewer.learnerId),
        ),
      );
    if (subscriptions.length > 0) {
      await tx
        .update(schema.communitySubscriptions)
        .set({ status: "cancelled", cancelAt: now, updatedAt: now })
        .where(
          inArray(
            schema.communitySubscriptions.id,
            subscriptions.map((row) => row.subscription.id),
          ),
        );
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: viewer.schoolId,
      actorId: viewer.learnerPublicId,
      action: "community.membership_left",
      resourceType: "community",
      resourceId: community.publicId,
      requestId,
      createdAt: now,
    });
    await recordActivity(tx as unknown as AppDb, {
      schoolId: viewer.schoolId,
      actorId: viewer.learnerId,
      type: ActivityType.COMMUNITY_LEFT,
      entityId: community.publicId,
      metadata: { membershipId: membership.publicId },
    }, clock);
  });

  return { ok: true, value: { left: true } };
}

export async function listMemberships(
  db: AppDb,
  context: AdminContext,
  communityPublicId: string,
  options: {
    cursor?: string;
    limit: number;
    status?:
      | "active"
      | "payment_failed"
      | "expired"
      | "pending"
      | "rejected"
      | "paused";
  },
): Promise<Result<{ items: CommunityMembershipDto[]; nextCursor: string | null }>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:read")) return forbidden();
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [eq(schema.communityMemberships.communityId, community.id)];
  if (options.status) {
    conditions.push(eq(schema.communityMemberships.status, options.status));
  }
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communityMemberships.createdAt, cursor.date),
        and(
          eq(schema.communityMemberships.createdAt, cursor.date),
          gt(schema.communityMemberships.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select({
      membership: schema.communityMemberships,
      learnerPublicId: schema.learners.publicId,
    })
    .from(schema.communityMemberships)
    .leftJoin(
      schema.learners,
      eq(schema.learners.id, schema.communityMemberships.learnerId),
    )
    .where(and(...conditions))
    .orderBy(
      asc(schema.communityMemberships.createdAt),
      asc(schema.communityMemberships.id),
    )
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const actors = await communityActorMap(
    db,
    page.map((row) => row.membership.learnerId),
    page.map((row) => row.membership.adminUserId),
  );
  return {
    ok: true,
    value: {
      items: page.map((row) =>
        membershipToDto(
          row.membership,
          row.learnerPublicId,
          communityPublicId,
          row.membership.learnerId
            ? (actors.get(`learner:${row.membership.learnerId}`) ?? null)
            : row.membership.adminUserId
              ? (actors.get(`admin:${row.membership.adminUserId}`) ?? null)
              : null,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCursor(page.at(-1)!.membership.createdAt, page.at(-1)!.membership.id)
          : null,
    },
  };
}

export async function updateMembership(
  db: AppDb,
  context: AdminContext,
  membershipPublicId: string,
  input: {
    status?: "active" | "pending" | "rejected";
    role?: "member" | "moderator" | "owner";
    rejectionReason?: string | null;
  },
  clock: Clock,
): Promise<Result<CommunityMembershipDto>> {
  const school = communityContext(context);
  if (!school || !adminCan(context, "communities:moderate")) return forbidden();
  const rows = await db
    .select({
      membership: schema.communityMemberships,
      communityPublicId: schema.communities.publicId,
      learnerPublicId: schema.learners.publicId,
    })
    .from(schema.communityMemberships)
    .innerJoin(
      schema.communities,
      eq(schema.communities.id, schema.communityMemberships.communityId),
    )
    .leftJoin(
      schema.learners,
      eq(schema.learners.id, schema.communityMemberships.learnerId),
    )
    .where(
      and(
        eq(schema.communityMemberships.schoolId, school.schoolId),
        eq(schema.communityMemberships.publicId, membershipPublicId),
      ),
    )
    .limit(1);
  const existing = rows[0]?.membership;
  if (!existing) return notFound();
  if (existing.adminUserId === context.principalId) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "cannot_change_own_membership" },
      }),
    };
  }
  const now = clock.now();
  if (
    input.role !== undefined &&
    input.role !== existing.role &&
    (input.status ?? existing.status) !== "active"
  ) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "cannot_change_role_inactive_member" },
      }),
    };
  }
  const nextStatus = input.status ?? existing.status;
  const requestedRejectionReason =
    input.rejectionReason === undefined
      ? existing.rejectionReason
      : input.rejectionReason?.trim() || null;
  if (nextStatus === "rejected" && !requestedRejectionReason) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "membership_rejection_reason_required" },
      }),
    };
  }
  const next = {
    status: nextStatus,
    role: input.role ?? existing.role,
    rejectionReason: nextStatus === "rejected" ? requestedRejectionReason : null,
    updatedAt: now,
  };
  if (
    await isLastActiveModerator(
      db,
      school.schoolId,
      existing.communityId,
      existing,
      next,
    )
  ) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "cannot_remove_last_moderator" },
      }),
    };
  }
  const actors = await communityActorMap(
    db,
    [existing.learnerId],
    [existing.adminUserId],
  );
  await db
    .update(schema.communityMemberships)
    .set(next)
    .where(eq(schema.communityMemberships.id, existing.id));
  if (next.status === "active" && existing.status !== "active" && existing.learnerId) {
    await recordActivity(db, {
      schoolId: school.schoolId,
      actorId: existing.learnerId,
      type: ActivityType.COMMUNITY_MEMBERSHIP_GRANTED,
      entityId: rows[0]?.communityPublicId ?? existing.communityId,
      metadata: { membershipId: existing.publicId, grantedBy: context.principalId },
    }, clock);
    await recordActivity(db, {
      schoolId: school.schoolId,
      actorId: existing.learnerId,
      type: ActivityType.COMMUNITY_JOINED,
      entityId: rows[0]?.communityPublicId ?? existing.communityId,
      metadata: { membershipId: existing.publicId },
    }, clock);
  }
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: school.schoolId,
    actorId: context.principalId,
    action: "community.membership_updated",
    resourceType: "community_membership",
    resourceId: membershipPublicId,
    requestId: context.requestId,
    createdAt: now,
  });
  if (
    next.status === "active" &&
    existing.status !== "active" &&
    existing.learnerId &&
    rows[0]?.communityPublicId
  ) {
    await createLearnerNotification(
      db,
      { schoolId: school.schoolId, learnerId: existing.learnerId },
      {
        type: "community_membership_granted",
        title: "Community membership approved",
        body: "Your request to join the community was approved.",
        href: `/dashboard/community/${rows[0].communityPublicId}`,
      },
      clock,
    );
  }
  return {
    ok: true,
    value: membershipToDto(
      { ...existing, ...next },
      rows[0]?.learnerPublicId,
      rows[0]?.communityPublicId,
      existing.learnerId
        ? (actors.get(`learner:${existing.learnerId}`) ?? null)
        : existing.adminUserId
          ? (actors.get(`admin:${existing.adminUserId}`) ?? null)
          : null,
    ),
  };
}

async function loadPost(db: AppDb, schoolId: string, publicId: string) {
  const rows = await db
    .select()
    .from(schema.communityPosts)
    .where(
      and(
        eq(schema.communityPosts.schoolId, schoolId),
        eq(schema.communityPosts.publicId, publicId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function loadComment(db: AppDb, schoolId: string, publicId: string) {
  const rows = await db
    .select()
    .from(schema.communityComments)
    .where(
      and(
        eq(schema.communityComments.schoolId, schoolId),
        eq(schema.communityComments.publicId, publicId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function resolveLearnerMapForPosts(
  db: AppDb,
  rows: (typeof schema.communityPosts.$inferSelect)[],
) {
  return learnerPublicIds(
    db,
    rows.map((row) => row.learnerId),
  );
}

async function resolveLearnerMapForComments(
  db: AppDb,
  rows: (typeof schema.communityComments.$inferSelect)[],
) {
  return learnerPublicIds(
    db,
    rows.map((row) => row.learnerId),
  );
}

export async function listPosts(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
  options: { cursor?: string; limit: number; category?: string },
): Promise<Result<{ items: CommunityPostDto[]; nextCursor: string | null }>> {
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  if (!(await canReadCommunity(db, school.schoolId, community.id, viewer)))
    return forbidden();
  const showPinnedFirst = !options.category || options.category === "All";
  const cursor = decodeCommunityPostCursor(options.cursor);
  if (options.cursor && !cursor) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const conditions = [
    eq(schema.communityPosts.schoolId, school.schoolId),
    eq(schema.communityPosts.communityId, community.id),
    isNull(schema.communityPosts.deletedAt),
  ];
  if (options.category && options.category !== "All") {
    conditions.push(eq(schema.communityPosts.category, options.category));
  }
  if (cursor) {
    const withinDateOrder = or(
      lt(schema.communityPosts.createdAt, cursor.date),
      and(
        eq(schema.communityPosts.createdAt, cursor.date),
        lt(schema.communityPosts.id, cursor.id),
      ),
    )!;
    conditions.push(
      showPinnedFirst
        ? cursor.pinned
          ? or(
              eq(schema.communityPosts.pinned, false),
              and(eq(schema.communityPosts.pinned, true), withinDateOrder),
            )!
          : and(eq(schema.communityPosts.pinned, false), withinDateOrder)!
        : withinDateOrder,
    );
  }
  const orderBy = showPinnedFirst
    ? [
        desc(schema.communityPosts.pinned),
        desc(schema.communityPosts.createdAt),
        desc(schema.communityPosts.id),
      ]
    : [desc(schema.communityPosts.createdAt), desc(schema.communityPosts.id)];
  const rows = await db
    .select()
    .from(schema.communityPosts)
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const ids = await resolveLearnerMapForPosts(db, page);
  const actors = await communityActorMap(
    db,
    page.map((row) => row.learnerId),
    page.map((row) => row.adminUserId),
  );
  const media = await communityMediaMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  const reactions = await communityReactionMap(
    db,
    school.schoolId,
    community.id,
    "post",
    page.map((row) => row.id),
    viewer,
  );
  const commentsCount = await communityCommentCountMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  const subscriptions = await communityPostSubscriptionSet(
    db,
    school.schoolId,
    page.map((row) => row.id),
    viewer,
  );
  return {
    ok: true,
    value: {
      items: page.map((row) =>
        postToDto(
          row,
          row.learnerId ? ids.get(row.learnerId) : null,
          community.publicId,
          media.get(row.id) ?? [],
          reactions.get(row.id) ?? [],
          commentsCount.get(row.id) ?? 0,
          subscriptions.has(row.id),
          row.learnerId
            ? (actors.get(`learner:${row.learnerId}`) ?? null)
            : row.adminUserId
              ? (actors.get(`admin:${row.adminUserId}`) ?? null)
              : null,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCommunityPostCursor(page.at(-1)!)
          : null,
    },
  };
}

export async function getPost(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  postPublicId: string,
): Promise<Result<CommunityPostDto>> {
  const row = await loadPost(db, school.schoolId, postPublicId);
  if (!row || row.deletedAt) return notFound();
  if (!(await canReadCommunity(db, school.schoolId, row.communityId, viewer))) {
    return forbidden();
  }

  const [learnerIds, media, reactions, commentsCount, subscriptions, actors] =
    await Promise.all([
      learnerPublicIds(db, row.learnerId ? [row.learnerId] : []),
      communityMediaMap(db, school.schoolId, [row.id]),
      communityReactionMap(
        db,
        school.schoolId,
        row.communityId,
        "post",
        [row.id],
        viewer,
      ),
      communityCommentCountMap(db, school.schoolId, [row.id]),
      communityPostSubscriptionSet(db, school.schoolId, [row.id], viewer),
      communityActorMap(db, [row.learnerId], [row.adminUserId]),
    ]);

  return {
    ok: true,
    value: postToDto(
      row,
      row.learnerId ? (learnerIds.get(row.learnerId) ?? null) : null,
      (await publicCommunityId(db, row.communityId)) ?? undefined,
      media.get(row.id) ?? [],
      reactions.get(row.id) ?? [],
      commentsCount.get(row.id) ?? 0,
      subscriptions.has(row.id),
      row.learnerId
        ? (actors.get(`learner:${row.learnerId}`) ?? null)
        : row.adminUserId
          ? (actors.get(`admin:${row.adminUserId}`) ?? null)
          : null,
    ),
  };
}

export async function createPost(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
  input: {
    title: string;
    content: string;
    category: string;
    mediaIds?: readonly string[];
  },
  clock: Clock,
): Promise<Result<CommunityPostDto>> {
  if (viewer.kind === "admin") return forbidden();
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  if (!(await canWriteCommunity(db, school.schoolId, community.id, viewer)))
    return forbidden();
  const title = input.title.trim();
  if (!title || title.length > 300 || !communityContentHasText(input.content)) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const category = input.category.trim() || "General";
  if (!parseCategories(community.categories).includes(category)) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_category" },
      }),
    };
  }
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("pst", clock),
    schoolId: school.schoolId,
    communityId: community.id,
    ...identityColumns(identity),
    title,
    content: input.content,
    category,
    pinned: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.communityPosts).values(row);
  await db.insert(schema.communityPostSubscribers).values({
    id: uuidv7(clock),
    schoolId: school.schoolId,
    communityId: community.id,
    postId: row.id,
    learnerId: viewer.learnerId,
    adminUserId: null,
  });
  const richTextMediaIds = await mediaIdsForRichTextContent(
    db,
    school.schoolId,
    input.content,
  );
  const mediaIds = [...new Set([...(input.mediaIds ?? []), ...richTextMediaIds])];
  if (mediaIds.length > 0) {
    const references = await reconcileCommunityMedia(
      db,
      school.schoolId,
      mediaIds,
      row.id,
      row.publicId,
      clock,
    );
    if (!references.ok) {
      await db
        .delete(schema.communityPosts)
        .where(eq(schema.communityPosts.id, row.id));
      return references;
    }
  }
  await recordActivity(db, {
    schoolId: school.schoolId,
    actorId: viewer.learnerId,
    type: ActivityType.COMMUNITY_POST_CREATED,
    entityId: row.publicId,
    metadata: { communityId: community.publicId },
  }, clock);
  const activeMembers = await db
    .select({ learnerId: schema.communityMemberships.learnerId })
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, school.schoolId),
        eq(schema.communityMemberships.communityId, community.id),
        eq(schema.communityMemberships.status, "active"),
      ),
    );
  await Promise.all(
    activeMembers
      .map((member) => member.learnerId)
      .filter((learnerId): learnerId is string => learnerId !== null)
      .filter((learnerId) => learnerId !== viewer.learnerId)
      .map((learnerId) =>
        createLearnerNotification(
          db,
          { schoolId: school.schoolId, learnerId },
          {
            type: "community_post_created",
            title: "New community post",
            body: `Someone posted in “${community.name}”.`,
            href: `/dashboard/community/${community.publicId}/${encodeURIComponent(row.publicId)}`,
          },
          clock,
        ),
      ),
  );
  const media = await communityMediaMap(db, school.schoolId, [row.id]);
  const reactions = await communityReactionMap(
    db,
    school.schoolId,
    community.id,
    "post",
    [row.id],
    viewer,
  );
  const commentsCount = await communityCommentCountMap(db, school.schoolId, [row.id]);
  const actors = await communityActorMap(db, [row.learnerId], [row.adminUserId]);
  return {
    ok: true,
    value: postToDto(
      row,
      identity.kind === "learner" ? identity.publicId : null,
      community.publicId,
      media.get(row.id) ?? [],
      reactions.get(row.id) ?? [],
      commentsCount.get(row.id) ?? 0,
      true,
      actors.get(`learner:${row.learnerId}`) ?? null,
    ),
  };
}

async function authorCanChange(
  viewer: CommunityViewer,
  learnerId: string | null,
  adminUserId: string | null,
) {
  if (viewer.kind === "admin") return adminCan(viewer.context, "communities:write");
  return viewer.learnerId === learnerId && !adminUserId;
}

export async function updatePost(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  publicId: string,
  input: {
    title?: string;
    content?: string;
    category?: string;
    pinned?: boolean;
    mediaIds?: readonly string[];
  },
  clock: Clock,
): Promise<Result<CommunityPostDto>> {
  const existing = await loadPost(db, school.schoolId, publicId);
  if (!existing || existing.deletedAt) return notFound();
  if (!(await canWriteCommunity(db, school.schoolId, existing.communityId, viewer)))
    return forbidden();
  if (!(await authorCanChange(viewer, existing.learnerId, existing.adminUserId)))
    return forbidden();
  const now = clock.now();
  const next = {
    title: input.title?.trim() ?? existing.title,
    content: input.content ?? existing.content,
    category: input.category?.trim() || existing.category,
    pinned: input.pinned ?? existing.pinned,
    updatedAt: now,
  };
  const community = await db
    .select()
    .from(schema.communities)
    .where(
      and(
        eq(schema.communities.id, existing.communityId),
        eq(schema.communities.schoolId, school.schoolId),
        isNull(schema.communities.deletedAt),
      ),
    )
    .limit(1);
  if (!community[0]) return notFound();
  if (!parseCategories(community[0].categories).includes(next.category)) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_category" },
      }),
    };
  }
  if (!next.title || !communityContentHasText(next.content))
    return { ok: false, error: createPlatformError("validation_failed") };
  const richTextMediaIds =
    input.content !== undefined
      ? await mediaIdsForRichTextContent(db, school.schoolId, input.content)
      : [];
  if (input.mediaIds !== undefined || richTextMediaIds.length > 0) {
    const currentMediaIds =
      input.mediaIds === undefined
        ? (
            (await communityMediaMap(db, school.schoolId, [existing.id])).get(
              existing.id,
            ) ?? []
          ).map((media) => media.id)
        : input.mediaIds;
    const references = await reconcileCommunityMedia(
      db,
      school.schoolId,
      [...new Set([...currentMediaIds, ...richTextMediaIds])],
      existing.id,
      existing.publicId,
      clock,
    );
    if (!references.ok) return references;
  }
  await db
    .update(schema.communityPosts)
    .set(next)
    .where(eq(schema.communityPosts.id, existing.id));
  const reactions = await communityReactionMap(
    db,
    school.schoolId,
    existing.communityId,
    "post",
    [existing.id],
    viewer,
  );
  const commentsCount = await communityCommentCountMap(db, school.schoolId, [
    existing.id,
  ]);
  const subscriptions = await communityPostSubscriptionSet(
    db,
    school.schoolId,
    [existing.id],
    viewer,
  );
  const actors = await communityActorMap(
    db,
    [existing.learnerId],
    [existing.adminUserId],
  );
  return {
    ok: true,
    value: postToDto(
      { ...existing, ...next },
      existing.learnerId
        ? (await learnerPublicIds(db, [existing.learnerId])).get(existing.learnerId)
        : null,
      (await publicCommunityId(db, existing.communityId)) ?? undefined,
      (await communityMediaMap(db, school.schoolId, [existing.id])).get(existing.id) ??
        [],
      reactions.get(existing.id) ?? [],
      commentsCount.get(existing.id) ?? 0,
      subscriptions.has(existing.id),
      existing.learnerId
        ? (actors.get(`learner:${existing.learnerId}`) ?? null)
        : existing.adminUserId
          ? (actors.get(`admin:${existing.adminUserId}`) ?? null)
          : null,
    ),
  };
}

export async function deletePost(
  db: AppDb,
  viewer: CommunityViewer,
  schoolId: string,
  publicId: string,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  const existing = await loadPost(db, schoolId, publicId);
  if (!existing || existing.deletedAt) return notFound();
  if (!(await canWriteCommunity(db, schoolId, existing.communityId, viewer)))
    return forbidden();
  const canDelete =
    (await authorCanChange(viewer, existing.learnerId, existing.adminUserId)) ||
    (await canModerateCommunity(db, schoolId, existing.communityId, viewer));
  if (!canDelete) return forbidden();
  const now = clock.now();
  await db
    .update(schema.communityPosts)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.communityPosts.id, existing.id));
  const comments = await db
    .select({ id: schema.communityComments.id })
    .from(schema.communityComments)
    .where(eq(schema.communityComments.postId, existing.id));
  if (comments.length > 0) {
    await db
      .update(schema.communityComments)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schema.communityComments.postId, existing.id));
  }
  await clearCommunityMediaReferences(db, schoolId, [
    existing.id,
    ...comments.map((comment) => comment.id),
  ]);
  return { ok: true, value: { id: publicId } };
}

export async function listComments(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  postPublicId: string,
  options: { cursor?: string; limit: number },
): Promise<Result<{ items: CommunityCommentDto[]; nextCursor: string | null }>> {
  const post = await loadPost(db, school.schoolId, postPublicId);
  if (!post || post.deletedAt) return notFound();
  if (!(await canReadCommunity(db, school.schoolId, post.communityId, viewer)))
    return forbidden();
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor)
    return { ok: false, error: createPlatformError("validation_failed") };
  const conditions = [
    eq(schema.communityComments.schoolId, school.schoolId),
    eq(schema.communityComments.postId, post.id),
  ];
  if (cursor) {
    conditions.push(
      or(
        gt(schema.communityComments.createdAt, cursor.date),
        and(
          eq(schema.communityComments.createdAt, cursor.date),
          gt(schema.communityComments.id, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.communityComments)
    .where(and(...conditions))
    .orderBy(asc(schema.communityComments.createdAt), asc(schema.communityComments.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const ids = await resolveLearnerMapForComments(db, page);
  const actors = await communityActorMap(
    db,
    page.map((row) => row.learnerId),
    page.map((row) => row.adminUserId),
  );
  const media = await communityMediaMap(
    db,
    school.schoolId,
    page.map((row) => row.id),
  );
  const commentReactions = await communityReactionMap(
    db,
    school.schoolId,
    post.communityId,
    "comment",
    page.filter((row) => !row.parentCommentId).map((row) => row.id),
    viewer,
  );
  const replyReactions = await communityReactionMap(
    db,
    school.schoolId,
    post.communityId,
    "reply",
    page.filter((row) => Boolean(row.parentCommentId)).map((row) => row.id),
    viewer,
  );
  const communityPublicId = await publicCommunityId(db, post.communityId);
  const parentPublicIds = await Promise.all(
    page.map((row) =>
      row.parentCommentId
        ? publicContentId(db, "comment", row.parentCommentId)
        : Promise.resolve(null),
    ),
  );
  return {
    ok: true,
    value: {
      items: page.map((row, index) =>
        commentToDto(
          row,
          row.learnerId ? ids.get(row.learnerId) : null,
          communityPublicId ?? undefined,
          postPublicId,
          parentPublicIds[index],
          media.get(row.id) ?? [],
          (row.parentCommentId ? replyReactions : commentReactions).get(row.id) ?? [],
          row.learnerId
            ? (actors.get(`learner:${row.learnerId}`) ?? null)
            : row.adminUserId
              ? (actors.get(`admin:${row.adminUserId}`) ?? null)
              : null,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id)
          : null,
    },
  };
}

export async function createComment(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  postPublicId: string,
  input: {
    content: string;
    parentCommentId?: string | null;
    mediaIds?: readonly string[];
  },
  clock: Clock,
): Promise<Result<CommunityCommentDto>> {
  if (viewer.kind === "admin") return forbidden();
  const post = await loadPost(db, school.schoolId, postPublicId);
  if (!post || post.deletedAt) return notFound();
  if (!(await canWriteCommunity(db, school.schoolId, post.communityId, viewer)))
    return forbidden();
  if (input.content.length > 20_000 || !communityContentHasText(input.content))
    return { ok: false, error: createPlatformError("validation_failed") };
  let parentCommentId: string | null = null;
  let parentLearnerId: string | null = null;
  if (input.parentCommentId) {
    const parent = await loadComment(db, school.schoolId, input.parentCommentId);
    if (
      !parent ||
      parent.postId !== post.id ||
      parent.parentCommentId ||
      parent.deletedAt
    )
      return notFound();
    parentCommentId = parent.id;
    parentLearnerId = parent.learnerId;
  }
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("cmt", clock),
    schoolId: school.schoolId,
    communityId: post.communityId,
    postId: post.id,
    parentCommentId,
    ...identityColumns(identity),
    content: input.content,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.communityComments).values(row);
  const richTextMediaIds = await mediaIdsForRichTextContent(
    db,
    school.schoolId,
    input.content,
  );
  const mediaIds = [...new Set([...(input.mediaIds ?? []), ...richTextMediaIds])];
  if (mediaIds.length > 0) {
    const references = await reconcileCommunityMedia(
      db,
      school.schoolId,
      mediaIds,
      row.id,
      row.publicId,
      clock,
      parentCommentId,
      input.parentCommentId ?? null,
    );
    if (!references.ok) {
      await db
        .delete(schema.communityComments)
        .where(eq(schema.communityComments.id, row.id));
      return references;
    }
  }
  const communityPublicId = (await publicCommunityId(db, post.communityId)) ?? "";
  await recordActivity(db, {
    schoolId: school.schoolId,
    actorId: viewer.learnerId,
    type: parentCommentId
      ? ActivityType.COMMUNITY_REPLY_CREATED
      : ActivityType.COMMUNITY_COMMENT_CREATED,
    entityId: row.publicId,
    metadata: {
      communityId: communityPublicId,
      postId: post.publicId,
      ...(parentCommentId ? { commentId: input.parentCommentId } : {}),
    },
  }, clock);
  await db
    .insert(schema.communityPostSubscribers)
    .values({
      id: uuidv7(clock),
      schoolId: school.schoolId,
      communityId: post.communityId,
      postId: post.id,
      learnerId: viewer.learnerId,
      adminUserId: null,
    })
    .onConflictDoNothing();
  const recipients = new Set<string>();
  if (post.learnerId) recipients.add(post.learnerId);
  if (parentLearnerId) recipients.add(parentLearnerId);
  const subscribers = await db
    .select({ learnerId: schema.communityPostSubscribers.learnerId })
    .from(schema.communityPostSubscribers)
    .where(eq(schema.communityPostSubscribers.postId, post.id));
  for (const subscriber of subscribers) {
    if (subscriber.learnerId) recipients.add(subscriber.learnerId);
  }
  recipients.delete(viewer.learnerId);
  await Promise.all(
    [...recipients].map((learnerId) =>
      createLearnerNotification(
        db,
        { schoolId: school.schoolId, learnerId },
        {
          type: parentCommentId ? "community_reply" : "community_comment",
          title: parentCommentId ? "New reply" : "New comment",
          body: parentCommentId
            ? `Someone replied to “${post.title}”.`
            : `Someone commented on “${post.title}”.`,
          href: `/dashboard/community/${communityPublicId}/${encodeURIComponent(post.publicId)}#${encodeURIComponent(row.publicId)}`,
        },
        clock,
      ),
    ),
  );
  const reactions = await communityReactionMap(
    db,
    school.schoolId,
    row.communityId,
    parentCommentId ? "reply" : "comment",
    [row.id],
    viewer,
  );
  const actors = await communityActorMap(db, [row.learnerId], [row.adminUserId]);
  return {
    ok: true,
    value: commentToDto(
      row,
      identity.kind === "learner" ? identity.publicId : null,
      (await publicCommunityId(db, row.communityId)) ?? undefined,
      postPublicId,
      parentCommentId ? input.parentCommentId : null,
      (await communityMediaMap(db, school.schoolId, [row.id])).get(row.id) ?? [],
      reactions.get(row.id) ?? [],
      actors.get(`learner:${row.learnerId}`) ?? null,
    ),
  };
}

export async function updateComment(
  db: AppDb,
  viewer: CommunityViewer,
  schoolId: string,
  publicId: string,
  input: { content: string; mediaIds?: readonly string[] },
  clock: Clock,
): Promise<Result<CommunityCommentDto>> {
  const existing = await loadComment(db, schoolId, publicId);
  if (!existing || existing.deletedAt) return notFound();
  if (!(await canWriteCommunity(db, schoolId, existing.communityId, viewer)))
    return forbidden();
  if (!(await authorCanChange(viewer, existing.learnerId, existing.adminUserId)))
    return forbidden();
  if (input.content.length > 20_000 || !communityContentHasText(input.content))
    return { ok: false, error: createPlatformError("validation_failed") };
  const richTextMediaIds = await mediaIdsForRichTextContent(
    db,
    schoolId,
    input.content,
  );
  if (input.mediaIds !== undefined || richTextMediaIds.length > 0) {
    const parentPublicId = existing.parentCommentId
      ? await publicContentId(db, "comment", existing.parentCommentId)
      : null;
    const currentMediaIds =
      input.mediaIds === undefined
        ? (
            (await communityMediaMap(db, schoolId, [existing.id])).get(existing.id) ??
            []
          ).map((media) => media.id)
        : input.mediaIds;
    const references = await reconcileCommunityMedia(
      db,
      schoolId,
      [...new Set([...currentMediaIds, ...richTextMediaIds])],
      existing.id,
      existing.publicId,
      clock,
      existing.parentCommentId,
      parentPublicId,
    );
    if (!references.ok) return references;
  }
  const next = { content: input.content, updatedAt: clock.now() };
  await db
    .update(schema.communityComments)
    .set(next)
    .where(eq(schema.communityComments.id, existing.id));
  const ids = await learnerPublicIds(db, [existing.learnerId]);
  const actors = await communityActorMap(
    db,
    [existing.learnerId],
    [existing.adminUserId],
  );
  const reactions = await communityReactionMap(
    db,
    schoolId,
    existing.communityId,
    existing.parentCommentId ? "reply" : "comment",
    [existing.id],
    viewer,
  );
  return {
    ok: true,
    value: commentToDto(
      { ...existing, ...next },
      existing.learnerId ? ids.get(existing.learnerId) : null,
      (await publicCommunityId(db, existing.communityId)) ?? undefined,
      (await publicContentId(db, "post", existing.postId)) ?? undefined,
      existing.parentCommentId
        ? await publicContentId(db, "comment", existing.parentCommentId)
        : null,
      (await communityMediaMap(db, schoolId, [existing.id])).get(existing.id) ?? [],
      reactions.get(existing.id) ?? [],
      existing.learnerId
        ? (actors.get(`learner:${existing.learnerId}`) ?? null)
        : existing.adminUserId
          ? (actors.get(`admin:${existing.adminUserId}`) ?? null)
          : null,
    ),
  };
}

export async function deleteComment(
  db: AppDb,
  viewer: CommunityViewer,
  schoolId: string,
  publicId: string,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  const existing = await loadComment(db, schoolId, publicId);
  if (!existing || existing.deletedAt) return notFound();
  if (!(await canWriteCommunity(db, schoolId, existing.communityId, viewer)))
    return forbidden();
  const canDelete =
    (await authorCanChange(viewer, existing.learnerId, existing.adminUserId)) ||
    (await canModerateCommunity(db, schoolId, existing.communityId, viewer));
  if (!canDelete) return forbidden();
  const now = clock.now();
  await db
    .update(schema.communityComments)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(schema.communityComments.id, existing.id));
  await clearCommunityMediaReferences(db, schoolId, [existing.id]);
  return { ok: true, value: { id: publicId } };
}

async function entityForCommunity(
  db: AppDb,
  schoolId: string,
  communityId: string,
  entityType: "post" | "comment" | "reply",
  entityPublicId: string,
) {
  if (entityType === "post") {
    const row = await loadPost(db, schoolId, entityPublicId);
    return row && row.communityId === communityId
      ? {
          id: row.id,
          parentId: null,
          deletedAt: row.deletedAt,
          authorId: row.learnerId,
          postPublicId: row.publicId,
        }
      : null;
  }
  const row = await loadComment(db, schoolId, entityPublicId);
  const posts = row
    ? await db
        .select({ deletedAt: schema.communityPosts.deletedAt })
        .from(schema.communityPosts)
        .where(
          and(
            eq(schema.communityPosts.id, row.postId),
            eq(schema.communityPosts.schoolId, schoolId),
          ),
        )
        .limit(1)
    : [];
  if (
    !row ||
    !posts[0] ||
    posts[0].deletedAt ||
    row.communityId !== communityId ||
    (entityType === "reply" ? !row.parentCommentId : row.parentCommentId)
  )
    return null;
  return {
    id: row.id,
    parentId: row.parentCommentId,
    deletedAt: row.deletedAt,
    authorId: row.learnerId,
    postPublicId: await publicContentId(db, "post", row.postId),
  };
}

export async function toggleReaction(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
  input: { entityType: "post" | "comment" | "reply"; entityId: string; emoji: string },
  clock: Clock,
): Promise<Result<{ active: boolean; emoji: CommunityEmoji; entityId: string }>> {
  if (viewer.kind === "admin") return forbidden();
  if (!(EMOJIS as readonly string[]).includes(input.emoji))
    return { ok: false, error: createPlatformError("validation_failed") };
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  if (!(await canWriteCommunity(db, school.schoolId, community.id, viewer)))
    return forbidden();
  const entity = await entityForCommunity(
    db,
    school.schoolId,
    community.id,
    input.entityType,
    input.entityId,
  );
  if (!entity || entity.deletedAt) return notFound();
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const columns = identityColumns(identity);
  const existing = await db
    .select()
    .from(schema.communityReactions)
    .where(
      and(
        eq(schema.communityReactions.communityId, community.id),
        eq(schema.communityReactions.entityType, input.entityType),
        eq(schema.communityReactions.entityId, entity.id),
        eq(schema.communityReactions.emoji, input.emoji),
        eq(schema.communityReactions.learnerId, identity.id),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .delete(schema.communityReactions)
      .where(eq(schema.communityReactions.id, existing[0].id));
    return {
      ok: true,
      value: {
        active: false,
        emoji: input.emoji as CommunityEmoji,
        entityId: input.entityId,
      },
    };
  }
  await db.insert(schema.communityReactions).values({
    id: uuidv7(clock),
    publicId: createPublicId("rct", clock),
    schoolId: school.schoolId,
    communityId: community.id,
    entityType: input.entityType,
    entityId: entity.id,
    emoji: input.emoji,
    ...columns,
  });
  await recordActivity(db, {
    schoolId: school.schoolId,
    actorId: viewer.learnerId,
    type:
      input.entityType === "post"
        ? ActivityType.COMMUNITY_POST_LIKED
        : input.entityType === "reply"
          ? ActivityType.COMMUNITY_REPLY_LIKED
          : ActivityType.COMMUNITY_COMMENT_LIKED,
    entityId: input.entityId,
    metadata: { communityId: community.publicId, emoji: input.emoji },
  }, clock);
  if (entity.authorId && entity.authorId !== viewer.learnerId) {
    const notificationType =
      input.entityType === "post"
        ? "community_post_liked"
        : input.entityType === "reply"
          ? "community_reply_liked"
          : "community_comment_liked";
    const contentLabel =
      input.entityType === "post"
        ? "post"
        : input.entityType === "reply"
          ? "reply"
          : "comment";
    await createLearnerNotification(
      db,
      { schoolId: school.schoolId, learnerId: entity.authorId },
      {
        type: notificationType,
        title: "New community reaction",
        body: `Someone reacted to your community ${contentLabel}.`,
        href: entity.postPublicId
          ? `/dashboard/community/${community.publicId}/${encodeURIComponent(entity.postPublicId)}${input.entityType === "post" ? "" : `#${encodeURIComponent(input.entityId)}`}`
          : `/dashboard/community/${community.publicId}`,
      },
      clock,
    );
  }
  return {
    ok: true,
    value: {
      active: true,
      emoji: input.emoji as CommunityEmoji,
      entityId: input.entityId,
    },
  };
}

export async function togglePostSubscription(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  postPublicId: string,
  subscribed: boolean,
  clock: Clock,
): Promise<Result<{ subscribed: boolean }>> {
  if (viewer.kind === "admin") return forbidden();
  const post = await loadPost(db, school.schoolId, postPublicId);
  if (!post || post.deletedAt) return notFound();
  if (!(await canReadCommunity(db, school.schoolId, post.communityId, viewer)))
    return forbidden();
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const columns = identityColumns(identity);
  const existing = await db
    .select()
    .from(schema.communityPostSubscribers)
    .where(
      and(
        eq(schema.communityPostSubscribers.postId, post.id),
        eq(schema.communityPostSubscribers.learnerId, identity.id),
      ),
    )
    .limit(1);
  if (subscribed && !existing[0]) {
    await db.insert(schema.communityPostSubscribers).values({
      id: uuidv7(clock),
      schoolId: school.schoolId,
      communityId: post.communityId,
      postId: post.id,
      ...columns,
    });
  } else if (!subscribed && existing[0]) {
    await db
      .delete(schema.communityPostSubscribers)
      .where(eq(schema.communityPostSubscribers.id, existing[0].id));
  }
  return { ok: true, value: { subscribed } };
}

async function reportEntityExists(
  db: AppDb,
  schoolId: string,
  communityId: string,
  input: { contentType: "post" | "comment" | "reply"; contentId: string },
) {
  const entity = await entityForCommunity(
    db,
    schoolId,
    communityId,
    input.contentType,
    input.contentId,
  );
  return entity && !entity.deletedAt ? entity : null;
}

export async function createReport(
  db: AppDb,
  viewer: CommunityViewer,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
  input: {
    contentType: "post" | "comment" | "reply";
    contentId: string;
    reason: string;
  },
  clock: Clock,
): Promise<Result<CommunityReportDto>> {
  if (viewer.kind === "admin") return forbidden();
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  if (!(await canReadCommunity(db, school.schoolId, community.id, viewer)))
    return forbidden();
  if (!input.reason.trim())
    return { ok: false, error: createPlatformError("validation_failed") };
  const entity = await reportEntityExists(db, school.schoolId, community.id, input);
  if (!entity) return notFound();
  const identity: Identity = {
    kind: "learner",
    id: viewer.learnerId,
    publicId: viewer.learnerPublicId,
  };
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("rpt", clock),
    schoolId: school.schoolId,
    communityId: community.id,
    contentType: input.contentType,
    contentId: entity.id,
    contentParentId: entity.parentId,
    ...identityColumns(identity),
    reason: input.reason.trim(),
    status: "pending" as const,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await db.insert(schema.communityReports).values(row);
  } catch (error) {
    if (String(error).includes("community_reports_")) {
      return {
        ok: false,
        error: createPlatformError("conflict", {
          safeDetails: { reason: "report_exists" },
        }),
      };
    }
    throw error;
  }
  const content =
    (
      await reportContentMap(db, school.schoolId, [
        { contentType: input.contentType, contentId: entity.id },
      ])
    ).get(`${input.contentType}:${entity.id}`) ?? null;
  return {
    ok: true,
    value: reportToDto(
      row,
      identity.kind === "learner" ? identity.publicId : null,
      community.publicId,
      input.contentId,
      input.contentType === "reply"
        ? await publicContentId(db, "comment", entity.parentId!)
        : null,
      content,
    ),
  };
}

export async function listReports(
  db: AppDb,
  context: AdminContext,
  school: { schoolId: string; publicId: string },
  communityPublicId: string,
  options: {
    status?: "pending" | "accepted" | "rejected";
    cursor?: string;
    limit: number;
  },
): Promise<Result<{ items: CommunityReportDto[]; nextCursor: string | null }>> {
  if (!adminCan(context, "communities:moderate")) return forbidden();
  const community = await loadCommunity(db, school.schoolId, communityPublicId);
  if (!community) return notFound();
  const cursor = decodeCursor(options.cursor);
  if (options.cursor && !cursor)
    return { ok: false, error: createPlatformError("validation_failed") };
  const conditions = [
    eq(schema.communityReports.schoolId, school.schoolId),
    eq(schema.communityReports.communityId, community.id),
  ];
  if (options.status)
    conditions.push(eq(schema.communityReports.status, options.status));
  if (cursor)
    conditions.push(
      or(
        gt(schema.communityReports.createdAt, cursor.date),
        and(
          eq(schema.communityReports.createdAt, cursor.date),
          gt(schema.communityReports.id, cursor.id),
        ),
      )!,
    );
  const rows = await db
    .select()
    .from(schema.communityReports)
    .where(and(...conditions))
    .orderBy(asc(schema.communityReports.createdAt), asc(schema.communityReports.id))
    .limit(options.limit + 1);
  const page = rows.slice(0, options.limit);
  const ids = await learnerPublicIds(
    db,
    page.map((row) => row.learnerId),
  );
  const contentIds = await Promise.all(
    page.map((row) => publicContentId(db, row.contentType, row.contentId)),
  );
  const parentIds = await Promise.all(
    page.map((row) =>
      row.contentParentId
        ? publicContentId(db, "comment", row.contentParentId)
        : Promise.resolve(null),
    ),
  );
  const contents = await reportContentMap(db, school.schoolId, page);
  return {
    ok: true,
    value: {
      items: page.map((row, index) =>
        reportToDto(
          row,
          row.learnerId ? ids.get(row.learnerId) : null,
          community.publicId,
          contentIds[index] ?? undefined,
          parentIds[index],
          contents.get(`${row.contentType}:${row.contentId}`) ?? null,
        ),
      ),
      nextCursor:
        rows.length > options.limit && page.at(-1)
          ? encodeCursor(page.at(-1)!.createdAt, page.at(-1)!.id)
          : null,
    },
  };
}

export async function updateReport(
  db: AppDb,
  context: AdminContext,
  schoolId: string,
  reportPublicId: string,
  input: {
    status: "pending" | "accepted" | "rejected";
    rejectionReason?: string | null;
  },
  clock: Clock,
): Promise<Result<CommunityReportDto>> {
  if (!adminCan(context, "communities:moderate")) return forbidden();
  const rows = await db
    .select()
    .from(schema.communityReports)
    .where(
      and(
        eq(schema.communityReports.schoolId, schoolId),
        eq(schema.communityReports.publicId, reportPublicId),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (!existing) return notFound();
  const now = clock.now();
  const rejectionReason = input.rejectionReason?.trim() || null;
  if (input.status === "rejected" && !rejectionReason) {
    return {
      ok: false,
      error: createPlatformError("conflict", {
        safeDetails: { reason: "report_rejection_reason_required" },
      }),
    };
  }
  const next = {
    status: input.status,
    rejectionReason: input.status === "rejected" ? rejectionReason : null,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx
      .update(schema.communityReports)
      .set(next)
      .where(eq(schema.communityReports.id, existing.id));
    if (input.status === "accepted") {
      if (existing.contentType === "post") {
        await tx
          .update(schema.communityPosts)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(schema.communityPosts.id, existing.contentId));
      } else {
        await tx
          .update(schema.communityComments)
          .set({ deletedAt: now, updatedAt: now })
          .where(eq(schema.communityComments.id, existing.contentId));
      }
    } else if (existing.status === "accepted") {
      const acceptedReports = await tx
        .select({ id: schema.communityReports.id })
        .from(schema.communityReports)
        .where(
          and(
            eq(schema.communityReports.schoolId, schoolId),
            eq(schema.communityReports.communityId, existing.communityId),
            eq(schema.communityReports.contentType, existing.contentType),
            eq(schema.communityReports.contentId, existing.contentId),
            eq(schema.communityReports.status, "accepted"),
            // The report being transitioned is still accepted until the update above commits.
            // Excluding it prevents a rejected report from keeping its content hidden.
            sql`${schema.communityReports.id} <> ${existing.id}`,
          ),
        );
      if (acceptedReports.length === 0) {
        if (existing.contentType === "post") {
          await tx
            .update(schema.communityPosts)
            .set({ deletedAt: null, updatedAt: now })
            .where(eq(schema.communityPosts.id, existing.contentId));
        } else {
          await tx
            .update(schema.communityComments)
            .set({ deletedAt: null, updatedAt: now })
            .where(eq(schema.communityComments.id, existing.contentId));
        }
      }
    }
  });
  const ids = await learnerPublicIds(db, [existing.learnerId]);
  const content =
    (await reportContentMap(db, schoolId, [existing])).get(
      `${existing.contentType}:${existing.contentId}`,
    ) ?? null;
  return {
    ok: true,
    value: reportToDto(
      { ...existing, ...next },
      existing.learnerId ? ids.get(existing.learnerId) : null,
      (await publicCommunityId(db, existing.communityId)) ?? undefined,
      (await publicContentId(db, existing.contentType, existing.contentId)) ??
        undefined,
      existing.contentParentId
        ? await publicContentId(db, "comment", existing.contentParentId)
        : null,
      content,
    ),
  };
}

export { EMOJIS };
