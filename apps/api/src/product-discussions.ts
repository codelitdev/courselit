import { createHash } from "node:crypto";
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
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import { createLearnerNotification } from "./notifications.js";
import type { CourseLitPermission } from "./permissions.js";
import { assertRateLimit } from "./rate-limit.js";
import type { AppDb } from "./types.js";

type AdminContext = PlatformRequestContext<string, string, CourseLitPermission>;
type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

export type DiscussionLearnerViewer = {
  kind: "learner";
  schoolId: string;
  schoolPublicId: string;
  learnerId: string;
  learnerPublicId: string;
};

export type DiscussionViewer =
  | { kind: "admin"; context: AdminContext }
  | DiscussionLearnerViewer;

type Target = {
  product: typeof schema.products.$inferSelect;
  lesson: typeof schema.lessons.$inferSelect;
};

type ContentType = "comment" | "reply";
type ContentDocument = { type: "doc"; [key: string]: unknown };

const COURSE_DISCUSSION_RATE_LIMITS = {
  commentsPerMinute: 5,
  commentsPerDay: 50,
  likesPerMinute: 60,
  reportsPerHour: 10,
} as const;

export type ProductDiscussionCommentDto = {
  id: string;
  productId: string;
  entityType: "lesson";
  entityId: string;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: ContentDocument;
  likesCount: number;
  hasLiked: boolean;
  replyCount: number;
  replies: ProductDiscussionReplyDto[];
  replyNextCursor: string | null;
  hasMoreReplies: boolean;
  deleted: boolean;
  deletedAt: string | null;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductDiscussionReplyDto = {
  id: string;
  productId: string;
  entityType: "lesson";
  entityId: string;
  commentId: string;
  parentReplyId: string | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  content: ContentDocument;
  likesCount: number;
  hasLiked: boolean;
  deleted: boolean;
  deletedAt: string | null;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProductDiscussionSummaryDto = {
  productId: string;
  entityType: "lesson";
  entityId: string;
  lessonTitle: string;
  commentsCount: number;
  repliesCount: number;
  totalCount: number;
  activityCountIncludingDeleted: number;
  lastActivityAt: string;
  lastCommentId: string | null;
  lastReplyId: string | null;
};

export type ProductDiscussionReportDto = {
  id: string;
  productId: string;
  entityType: "lesson";
  entityId: string;
  contentType: ContentType;
  contentId: string;
  commentId: string | null;
  reporterId: string | null;
  reporterKind: "learner" | "admin" | null;
  authorId: string | null;
  authorKind: "learner" | "admin" | null;
  reason: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason: string | null;
  lessonTitle: string;
  contentPreview: string | null;
  contentDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

function forbidden(): Result<never> {
  return { ok: false, error: createPlatformError("forbidden") };
}

function notFound(): Result<never> {
  return { ok: false, error: createPlatformError("not_found") };
}

function invalid(): Result<never> {
  return { ok: false, error: createPlatformError("validation_failed") };
}

function adminCan(context: AdminContext, permission: CourseLitPermission): boolean {
  return Boolean(context.tenantId && context.permissions.has(permission));
}

function viewerSchool(viewer: DiscussionViewer): string {
  return viewer.kind === "learner" ? viewer.schoolId : viewer.context.tenantId!;
}

function viewerActorId(viewer: DiscussionViewer): string {
  return viewer.kind === "learner"
    ? viewer.learnerPublicId
    : viewer.context.principalId;
}

function discussionSubject(target: Target): string {
  return `${target.product.publicId}:lesson:${target.lesson.publicId}`;
}

async function enforceDiscussionRateLimit(
  db: AppDb,
  viewer: DiscussionViewer,
  target: Target,
  action: string,
  clock: Clock,
  limits: {
    perMinute?: number;
    perDay?: number;
    perHour?: number;
    fingerprint?: string;
  },
): Promise<Result<null>> {
  const base = {
    schoolId: target.product.schoolId,
    userId: viewerActorId(viewer),
    scope: "course_discussion",
    subjectId: discussionSubject(target),
  };
  if (limits.perDay !== undefined) {
    const daily = await assertRateLimit(
      db,
      {
        ...base,
        action: `${action}:day`,
        windowMs: 86_400_000,
        limit: limits.perDay,
      },
      clock,
    );
    if (!daily.ok) return daily;
  }
  if (limits.perHour !== undefined) {
    const hourly = await assertRateLimit(
      db,
      {
        ...base,
        action: `${action}:hour`,
        windowMs: 3_600_000,
        limit: limits.perHour,
      },
      clock,
    );
    if (!hourly.ok) return hourly;
  }
  if (limits.perMinute !== undefined) {
    const minute = await assertRateLimit(
      db,
      {
        ...base,
        action: `${action}:minute`,
        windowMs: 60_000,
        limit: limits.perMinute,
        fingerprint: limits.fingerprint,
      },
      clock,
    );
    if (!minute.ok) return minute;
  }
  return { ok: true, value: null };
}

function discussionFingerprint(document: ContentDocument): string {
  return createHash("sha256")
    .update(contentText(document).trim().replace(/\s+/g, " "), "utf8")
    .digest("hex");
}

type AccessibleDiscussionLessons = {
  product: typeof schema.products.$inferSelect;
  lessons: (typeof schema.lessons.$inferSelect)[];
};

async function accessibleDiscussionLessons(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  now: Date,
): Promise<Result<AccessibleDiscussionLessons>> {
  if (viewer.kind === "admin" && !adminCan(viewer.context, "products:read")) {
    return forbidden();
  }
  const products = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, viewerSchool(viewer)),
        eq(schema.products.publicId, productPublicId),
        eq(schema.products.kind, "course"),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return notFound();
  if (!product.discussions) return forbidden();

  let membershipStartedAt: Date | null = null;
  if (viewer.kind === "learner") {
    if (product.status !== "published") return notFound();
    const membership = await db
      .select({ createdAt: schema.learnerMemberships.createdAt })
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolId, viewer.schoolId),
          eq(schema.learnerMemberships.learnerId, viewer.learnerId),
          eq(schema.learnerMemberships.entityType, "product"),
          eq(schema.learnerMemberships.entityId, product.publicId),
          eq(schema.learnerMemberships.status, "active"),
        ),
      )
      .limit(1);
    if (!membership[0]) return forbidden();
    membershipStartedAt = membership[0].createdAt;
  }

  const lessons = await db
    .select()
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.schoolId, product.schoolId),
        eq(schema.lessons.productId, product.id),
        eq(schema.lessons.status, "published"),
      ),
    )
    .orderBy(asc(schema.lessons.position));
  const sections = membershipStartedAt
    ? await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, product.id))
        .orderBy(asc(schema.productSections.position))
    : [];
  return {
    ok: true,
    value: {
      product,
      lessons: membershipStartedAt
        ? lessons.filter((lesson) => {
            const availableAt = lessonUnlockAt(lesson, membershipStartedAt!);
            const section = lesson.sectionId
              ? sections.find((candidate) => candidate.id === lesson.sectionId)
              : undefined;
            if (section?.dripEnabled) {
              const sectionAvailableAt = sectionUnlockAt(
                sections,
                section.id,
                membershipStartedAt!,
              );
              if (!sectionAvailableAt || sectionAvailableAt > now) return false;
            }
            return !availableAt || availableAt <= now;
          })
        : viewer.kind === "admin"
          ? lessons
          : [],
    },
  };
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

function contentText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { type?: unknown; text?: unknown; content?: unknown };
  const own = node.type === "text" && typeof node.text === "string" ? node.text : "";
  const children = Array.isArray(node.content)
    ? node.content.map(contentText).join(node.type === "paragraph" ? "\n" : "")
    : "";
  return `${own}${children}`;
}

export function validateDiscussionContent(input: unknown): ContentDocument | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const document = input as ContentDocument;
  if (document.type !== "doc") return null;
  const serialized = JSON.stringify(document);
  if (Buffer.byteLength(serialized, "utf8") > 32768) return null;
  const text = contentText(document).trim();
  if (!text || text.length > 5000) return null;
  return document;
}

function parseContent(value: string): ContentDocument {
  try {
    const parsed = JSON.parse(value) as unknown;
    return validateDiscussionContent(parsed) ?? { type: "doc", content: [] };
  } catch {
    return { type: "doc", content: [] };
  }
}

function identityColumns(viewer: DiscussionViewer) {
  return viewer.kind === "learner"
    ? { learnerId: viewer.learnerId, adminUserId: null }
    : { learnerId: null, adminUserId: viewer.context.principalId };
}

async function ensureSubscriber(
  tx: any,
  target: Target,
  viewer: DiscussionViewer,
  clock: Clock,
) {
  const now = clock.now();
  const identity = identityColumns(viewer);
  await tx
    .insert(schema.productDiscussionSubscribers)
    .values({
      id: uuidv7(clock),
      publicId: createPublicId("pds", clock),
      schoolId: target.product.schoolId,
      productId: target.product.id,
      entityType: "lesson",
      entityId: target.lesson.id,
      ...identity,
      subscription: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing();
  await tx
    .update(schema.productDiscussionSubscribers)
    .set({ subscription: true, updatedAt: now })
    .where(
      and(
        eq(schema.productDiscussionSubscribers.productId, target.product.id),
        eq(schema.productDiscussionSubscribers.entityType, "lesson"),
        eq(schema.productDiscussionSubscribers.entityId, target.lesson.id),
        viewer.kind === "learner"
          ? eq(schema.productDiscussionSubscribers.learnerId, viewer.learnerId)
          : eq(
              schema.productDiscussionSubscribers.adminUserId,
              viewer.context.principalId,
            ),
      ),
    );
}

function authorFields(row: {
  learnerId: string | null;
  adminUserId: string | null;
  learnerPublicId?: string | null;
}) {
  return {
    authorId: row.learnerId ? (row.learnerPublicId ?? null) : (row.adminUserId ?? null),
    authorKind: row.learnerId
      ? ("learner" as const)
      : row.adminUserId
        ? ("admin" as const)
        : null,
  };
}

async function learnerPublicId(db: AppDb, id: string | null): Promise<string | null> {
  if (!id) return null;
  const rows = await db
    .select({ publicId: schema.learners.publicId })
    .from(schema.learners)
    .where(eq(schema.learners.id, id))
    .limit(1);
  return rows[0]?.publicId ?? null;
}

async function resolveTarget(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  now: Date,
): Promise<Result<Target>> {
  if (viewer.kind === "admin" && !adminCan(viewer.context, "products:read")) {
    return forbidden();
  }
  const schoolId = viewerSchool(viewer);
  const rows = await db
    .select({ product: schema.products, lesson: schema.lessons })
    .from(schema.products)
    .innerJoin(
      schema.lessons,
      and(
        eq(schema.lessons.productId, schema.products.id),
        eq(schema.lessons.schoolId, schema.products.schoolId),
      ),
    )
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        eq(schema.products.publicId, productPublicId),
        eq(schema.products.kind, "course"),
        eq(schema.lessons.publicId, lessonPublicId),
      ),
    )
    .limit(1);
  const target = rows[0];
  if (!target) return notFound();
  if (!target.product.discussions) return forbidden();
  if (viewer.kind === "admin") return { ok: true, value: target };
  if (target.product.status !== "published" || target.lesson.status !== "published") {
    return notFound();
  }
  const membership = await db
    .select({ createdAt: schema.learnerMemberships.createdAt })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, schoolId),
        eq(schema.learnerMemberships.learnerId, viewer.learnerId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, target.product.publicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    )
    .limit(1);
  const activeMembership = membership[0];
  if (!activeMembership) return forbidden();
  const startedAt = activeMembership.createdAt;
  const availableAt = lessonUnlockAt(target.lesson, startedAt);
  if (availableAt && availableAt > now) return forbidden();
  if (target.lesson.sectionId) {
    const sections = await db
      .select()
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, target.product.id))
      .orderBy(asc(schema.productSections.position));
    const section = sections.find(
      (candidate) => candidate.id === target.lesson.sectionId,
    );
    if (section?.dripEnabled) {
      const sectionAvailableAt = sectionUnlockAt(sections, section.id, startedAt);
      if (!sectionAvailableAt || sectionAvailableAt > now) return forbidden();
    }
  }
  return { ok: true, value: target };
}

function targetFilter(target: Target) {
  return and(
    eq(schema.productDiscussionComments.schoolId, target.product.schoolId),
    eq(schema.productDiscussionComments.productId, target.product.id),
    eq(schema.productDiscussionComments.entityType, "lesson"),
    eq(schema.productDiscussionComments.entityId, target.lesson.id),
  );
}

async function summaryForTarget(
  db: AppDb,
  target: Target,
): Promise<ProductDiscussionSummaryDto> {
  const rows = await db
    .select()
    .from(schema.productDiscussionSummaries)
    .where(
      and(
        eq(schema.productDiscussionSummaries.schoolId, target.product.schoolId),
        eq(schema.productDiscussionSummaries.productId, target.product.id),
        eq(schema.productDiscussionSummaries.entityType, "lesson"),
        eq(schema.productDiscussionSummaries.entityId, target.lesson.id),
      ),
    )
    .limit(1);
  const row = rows[0];
  const now = new Date(0);
  return {
    productId: target.product.publicId,
    entityType: "lesson",
    entityId: target.lesson.publicId,
    lessonTitle: target.lesson.title,
    commentsCount: row?.commentsCount ?? 0,
    repliesCount: row?.repliesCount ?? 0,
    totalCount: row?.totalCount ?? 0,
    activityCountIncludingDeleted: row?.activityCountIncludingDeleted ?? 0,
    lastActivityAt: serializeDate(row?.lastActivityAt ?? now),
    lastCommentId: row?.lastCommentId ?? null,
    lastReplyId: row?.lastReplyId ?? null,
  };
}

export async function listDiscussionSummaries(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  input: { cursor?: string; limit?: number },
  now: Date,
): Promise<
  Result<{
    items: ProductDiscussionSummaryDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }>
> {
  const access = await accessibleDiscussionLessons(db, viewer, productPublicId, now);
  if (!access.ok) return access;
  const cursor = decodeCursor(input.cursor);
  if (input.cursor && !cursor) return invalid();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const lessonIds = access.value.lessons.map((lesson) => lesson.id);
  if (lessonIds.length === 0) {
    return { ok: true, value: { items: [], nextCursor: null, hasMore: false } };
  }
  const filters = [
    eq(schema.productDiscussionSummaries.schoolId, access.value.product.schoolId),
    eq(schema.productDiscussionSummaries.productId, access.value.product.id),
    eq(schema.productDiscussionSummaries.entityType, "lesson"),
    inArray(schema.productDiscussionSummaries.entityId, lessonIds),
    gt(schema.productDiscussionSummaries.activityCountIncludingDeleted, 0),
  ];
  if (cursor) {
    filters.push(
      or(
        lt(schema.productDiscussionSummaries.lastActivityAt, cursor.date),
        and(
          eq(schema.productDiscussionSummaries.lastActivityAt, cursor.date),
          lt(schema.lessons.publicId, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select({
      summary: schema.productDiscussionSummaries,
      lessonTitle: schema.lessons.title,
      lessonPublicId: schema.lessons.publicId,
    })
    .from(schema.productDiscussionSummaries)
    .innerJoin(
      schema.lessons,
      and(
        eq(schema.lessons.id, schema.productDiscussionSummaries.entityId),
        eq(schema.lessons.productId, access.value.product.id),
      ),
    )
    .where(and(...filters))
    .orderBy(
      desc(schema.productDiscussionSummaries.lastActivityAt),
      desc(schema.lessons.publicId),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    ok: true,
    value: {
      items: page.map(({ summary, lessonTitle, lessonPublicId }) => ({
        productId: access.value.product.publicId,
        entityType: "lesson",
        entityId: lessonPublicId,
        lessonTitle,
        commentsCount: summary.commentsCount,
        repliesCount: summary.repliesCount,
        totalCount: summary.totalCount,
        activityCountIncludingDeleted: summary.activityCountIncludingDeleted,
        lastActivityAt: serializeDate(summary.lastActivityAt),
        lastCommentId: summary.lastCommentId,
        lastReplyId: summary.lastReplyId,
      })),
      nextCursor: hasMore
        ? encodeCursor(
            page[page.length - 1]!.summary.lastActivityAt,
            page[page.length - 1]!.lessonPublicId,
          )
        : null,
      hasMore,
    },
  };
}

async function upsertSummary(
  tx: any,
  target: Target,
  input: {
    commentsDelta: number;
    repliesDelta: number;
    activityDelta: number;
    now: Date;
    commentId?: string;
    replyId?: string;
  },
  clock: Clock,
) {
  const summary = schema.productDiscussionSummaries;
  await tx
    .insert(summary)
    .values({
      id: uuidv7(clock),
      schoolId: target.product.schoolId,
      productId: target.product.id,
      entityType: "lesson",
      entityId: target.lesson.id,
      commentsCount: Math.max(0, input.commentsDelta),
      repliesCount: Math.max(0, input.repliesDelta),
      totalCount: Math.max(0, input.commentsDelta + input.repliesDelta),
      activityCountIncludingDeleted: Math.max(0, input.activityDelta),
      lastActivityAt: input.now,
      lastCommentId: input.commentId ?? null,
      lastReplyId: input.replyId ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [
        summary.schoolId,
        summary.productId,
        summary.entityType,
        summary.entityId,
      ],
      set: {
        commentsCount: sql`${summary.commentsCount} + ${input.commentsDelta}`,
        repliesCount: sql`${summary.repliesCount} + ${input.repliesDelta}`,
        totalCount: sql`${summary.totalCount} + ${input.commentsDelta + input.repliesDelta}`,
        activityCountIncludingDeleted: sql`${summary.activityCountIncludingDeleted} + ${input.activityDelta}`,
        lastActivityAt: input.now,
        lastCommentId: input.commentId ?? sql`${summary.lastCommentId}`,
        lastReplyId: input.replyId ?? sql`${summary.lastReplyId}`,
        updatedAt: input.now,
      },
    });
}

async function commentDto(
  db: AppDb,
  row: typeof schema.productDiscussionComments.$inferSelect,
  target: Target,
  viewer: DiscussionViewer,
): Promise<ProductDiscussionCommentDto> {
  const [publicId, replyCount, liked, replyRows] = await Promise.all([
    learnerPublicId(db, row.learnerId),
    db
      .select({ count: count() })
      .from(schema.productDiscussionReplies)
      .where(and(eq(schema.productDiscussionReplies.commentId, row.id))),
    db
      .select({ id: schema.productDiscussionLikes.id })
      .from(schema.productDiscussionLikes)
      .where(
        and(
          eq(schema.productDiscussionLikes.contentType, "comment"),
          eq(schema.productDiscussionLikes.contentId, row.id),
          viewer.kind === "learner"
            ? eq(schema.productDiscussionLikes.learnerId, viewer.learnerId)
            : eq(schema.productDiscussionLikes.adminUserId, viewer.context.principalId),
        ),
      )
      .limit(1),
    db
      .select()
      .from(schema.productDiscussionReplies)
      .where(eq(schema.productDiscussionReplies.commentId, row.id))
      .orderBy(
        asc(schema.productDiscussionReplies.createdAt),
        asc(schema.productDiscussionReplies.publicId),
      )
      .limit(3),
  ]);
  const replies = await Promise.all(
    replyRows
      .slice(0, 2)
      .map((reply) => replyDto(db, reply, target, viewer, row.publicId)),
  );
  return {
    id: row.publicId,
    productId: target.product.publicId,
    entityType: "lesson",
    entityId: target.lesson.publicId,
    ...authorFields({ ...row, learnerPublicId: publicId }),
    content: row.deletedAt ? { type: "doc", content: [] } : parseContent(row.content),
    likesCount: row.likesCount,
    hasLiked: Boolean(liked[0]),
    replyCount: Number(replyCount[0]?.count ?? 0),
    replies,
    replyNextCursor:
      replyRows.length > 2
        ? encodeCursor(replyRows[1]!.createdAt, replyRows[1]!.publicId)
        : null,
    hasMoreReplies: replyRows.length > 2,
    deleted: Boolean(row.deletedAt),
    deletedAt: row.deletedAt ? serializeDate(row.deletedAt) : null,
    isEdited: row.isEdited,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

async function replyDto(
  db: AppDb,
  row: typeof schema.productDiscussionReplies.$inferSelect,
  target: Target,
  viewer: DiscussionViewer,
  commentPublicId: string,
): Promise<ProductDiscussionReplyDto> {
  const [publicId, parent] = await Promise.all([
    learnerPublicId(db, row.learnerId),
    row.parentReplyId
      ? db
          .select({ publicId: schema.productDiscussionReplies.publicId })
          .from(schema.productDiscussionReplies)
          .where(eq(schema.productDiscussionReplies.id, row.parentReplyId))
          .limit(1)
      : Promise.resolve([]),
  ]);
  const liked = await db
    .select({ id: schema.productDiscussionLikes.id })
    .from(schema.productDiscussionLikes)
    .where(
      and(
        eq(schema.productDiscussionLikes.contentType, "reply"),
        eq(schema.productDiscussionLikes.contentId, row.id),
        viewer.kind === "learner"
          ? eq(schema.productDiscussionLikes.learnerId, viewer.learnerId)
          : eq(schema.productDiscussionLikes.adminUserId, viewer.context.principalId),
      ),
    )
    .limit(1);
  return {
    id: row.publicId,
    productId: target.product.publicId,
    entityType: "lesson",
    entityId: target.lesson.publicId,
    commentId: commentPublicId,
    parentReplyId: parent[0]?.publicId ?? null,
    ...authorFields({ ...row, learnerPublicId: publicId }),
    content: row.deletedAt ? { type: "doc", content: [] } : parseContent(row.content),
    likesCount: row.likesCount,
    hasLiked: Boolean(liked[0]),
    deleted: Boolean(row.deletedAt),
    deletedAt: row.deletedAt ? serializeDate(row.deletedAt) : null,
    isEdited: row.isEdited,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

export async function listDiscussionComments(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  input: { cursor?: string; limit?: number },
  now: Date,
): Promise<
  Result<{
    items: ProductDiscussionCommentDto[];
    nextCursor: string | null;
    hasMore: boolean;
    summary: ProductDiscussionSummaryDto;
  }>
> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    now,
  );
  if (!targetResult.ok) return targetResult;
  const cursor = decodeCursor(input.cursor);
  if (input.cursor && !cursor) return invalid();
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100);
  const filters = [targetFilter(targetResult.value)];
  if (cursor) {
    filters.push(
      or(
        lt(schema.productDiscussionComments.createdAt, cursor.date),
        and(
          eq(schema.productDiscussionComments.createdAt, cursor.date),
          lt(schema.productDiscussionComments.publicId, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.productDiscussionComments)
    .where(and(...filters))
    .orderBy(
      desc(schema.productDiscussionComments.createdAt),
      desc(schema.productDiscussionComments.publicId),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    ok: true,
    value: {
      items: await Promise.all(
        page.map((row) => commentDto(db, row, targetResult.value, viewer)),
      ),
      nextCursor: hasMore
        ? encodeCursor(
            page[page.length - 1]!.createdAt,
            page[page.length - 1]!.publicId,
          )
        : null,
      hasMore,
      summary: await summaryForTarget(db, targetResult.value),
    },
  };
}

export async function listDiscussionReplies(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  commentPublicId: string,
  input: { cursor?: string; limit?: number },
  now: Date,
): Promise<
  Result<{
    items: ProductDiscussionReplyDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }>
> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    now,
  );
  if (!targetResult.ok) return targetResult;
  const commentRows = await db
    .select()
    .from(schema.productDiscussionComments)
    .where(
      and(
        targetFilter(targetResult.value),
        eq(schema.productDiscussionComments.publicId, commentPublicId),
      ),
    )
    .limit(1);
  const comment = commentRows[0];
  if (!comment) return notFound();
  const cursor = decodeCursor(input.cursor);
  if (input.cursor && !cursor) return invalid();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const filters = [eq(schema.productDiscussionReplies.commentId, comment.id)];
  if (cursor) {
    filters.push(
      or(
        gt(schema.productDiscussionReplies.createdAt, cursor.date),
        and(
          eq(schema.productDiscussionReplies.createdAt, cursor.date),
          gt(schema.productDiscussionReplies.publicId, cursor.id),
        )!,
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.productDiscussionReplies)
    .where(and(...filters))
    .orderBy(
      asc(schema.productDiscussionReplies.createdAt),
      asc(schema.productDiscussionReplies.publicId),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    ok: true,
    value: {
      items: await Promise.all(
        page.map((row) =>
          replyDto(db, row, targetResult.value, viewer, comment.publicId),
        ),
      ),
      nextCursor: hasMore
        ? encodeCursor(
            page[page.length - 1]!.createdAt,
            page[page.length - 1]!.publicId,
          )
        : null,
      hasMore,
    },
  };
}

async function commentForTarget(db: AppDb, target: Target, publicId: string) {
  const rows = await db
    .select()
    .from(schema.productDiscussionComments)
    .where(
      and(
        targetFilter(target),
        eq(schema.productDiscussionComments.publicId, publicId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function replyForTarget(db: AppDb, target: Target, publicId: string) {
  const rows = await db
    .select()
    .from(schema.productDiscussionReplies)
    .where(
      and(
        eq(schema.productDiscussionReplies.schoolId, target.product.schoolId),
        eq(schema.productDiscussionReplies.productId, target.product.id),
        eq(schema.productDiscussionReplies.entityType, "lesson"),
        eq(schema.productDiscussionReplies.entityId, target.lesson.id),
        eq(schema.productDiscussionReplies.publicId, publicId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

function owns(
  viewer: DiscussionViewer,
  row: { learnerId: string | null; adminUserId: string | null },
): boolean {
  return viewer.kind === "learner"
    ? row.learnerId === viewer.learnerId
    : row.adminUserId === viewer.context.principalId;
}

export async function createDiscussionComment(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  content: unknown,
  clock: Clock,
): Promise<Result<ProductDiscussionCommentDto>> {
  const document = validateDiscussionContent(content);
  if (!document) return invalid();
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const target = targetResult.value;
  const rateLimit = await enforceDiscussionRateLimit(
    db,
    viewer,
    target,
    "comment:create",
    clock,
    {
      perMinute: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute,
      perDay: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay,
      fingerprint: discussionFingerprint(document),
    },
  );
  if (!rateLimit.ok) return rateLimit;
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("pdc", clock),
    schoolId: target.product.schoolId,
    productId: target.product.id,
    entityType: "lesson" as const,
    entityId: target.lesson.id,
    ...identityColumns(viewer),
    content: JSON.stringify(document),
    likesCount: 0,
    deletedAt: null,
    deletedBy: null,
    deletedByRole: null,
    deleteReason: null,
    restoredAt: null,
    restoredBy: null,
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx.insert(schema.productDiscussionComments).values(row);
    await upsertSummary(
      tx,
      target,
      {
        commentsDelta: 1,
        repliesDelta: 0,
        activityDelta: 1,
        now,
        commentId: row.publicId,
      },
      clock,
    );
    await ensureSubscriber(tx, target, viewer, clock);
  });
  await notifyDiscussionLearners(
    db,
    target,
    viewer,
    {
      type: "course_discussion_comment_created",
      title: "New discussion comment",
      body: `Someone commented on “${target.product.title}”.`,
      href: `/dashboard/courses/${encodeURIComponent(target.product.publicId)}/${encodeURIComponent(target.lesson.publicId)}#discussion-comment-${encodeURIComponent(row.publicId)}`,
    },
    clock,
  );
  await recordActivity(db, {
    schoolId: target.product.schoolId,
    actorId: viewer.kind === "learner" ? viewer.learnerId : viewer.context.principalId,
    type: ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
    entityId: row.publicId,
    metadata: {
      productId: target.product.publicId,
      lessonId: target.lesson.publicId,
      entityType: "comment",
    },
  }, clock);
  return { ok: true, value: await commentDto(db, row, target, viewer) };
}

export async function updateDiscussionComment(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  commentPublicId: string,
  content: unknown,
  clock: Clock,
): Promise<Result<ProductDiscussionCommentDto>> {
  const document = validateDiscussionContent(content);
  if (!document) return invalid();
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const row = await commentForTarget(db, targetResult.value, commentPublicId);
  if (!row) return notFound();
  if (!owns(viewer, row) || row.deletedAt) return forbidden();
  const now = clock.now();
  await db
    .update(schema.productDiscussionComments)
    .set({ content: JSON.stringify(document), isEdited: true, updatedAt: now })
    .where(eq(schema.productDiscussionComments.id, row.id));
  return {
    ok: true,
    value: await commentDto(
      db,
      { ...row, content: JSON.stringify(document), isEdited: true, updatedAt: now },
      targetResult.value,
      viewer,
    ),
  };
}

export async function deleteDiscussionComment(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  commentPublicId: string,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const row = await commentForTarget(db, targetResult.value, commentPublicId);
  if (!row) return notFound();
  if (!owns(viewer, row) || row.deletedAt) return forbidden();
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.productDiscussionComments)
      .set({
        deletedAt: now,
        deletedBy:
          viewer.kind === "learner"
            ? viewer.learnerPublicId
            : viewer.context.principalId,
        deletedByRole: "author",
        updatedAt: now,
      })
      .where(eq(schema.productDiscussionComments.id, row.id));
    await tx
      .delete(schema.productDiscussionLikes)
      .where(eq(schema.productDiscussionLikes.contentId, row.id));
    await upsertSummary(
      tx,
      targetResult.value,
      {
        commentsDelta: -1,
        repliesDelta: 0,
        activityDelta: 0,
        now,
      },
      clock,
    );
  });
  return { ok: true, value: { id: row.publicId } };
}

export async function createDiscussionReply(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  commentPublicId: string,
  content: unknown,
  parentReplyPublicId: string | undefined,
  clock: Clock,
): Promise<Result<ProductDiscussionReplyDto>> {
  const document = validateDiscussionContent(content);
  if (!document) return invalid();
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const target = targetResult.value;
  const comment = await commentForTarget(db, target, commentPublicId);
  if (!comment) return notFound();
  let parentReplyId: string | null = null;
  if (parentReplyPublicId) {
    const parent = await replyForTarget(db, target, parentReplyPublicId);
    if (!parent || parent.commentId !== comment.id || parent.deletedAt)
      return notFound();
    parentReplyId = parent.id;
  }
  const rateLimit = await enforceDiscussionRateLimit(
    db,
    viewer,
    target,
    "reply:create",
    clock,
    {
      perMinute: COURSE_DISCUSSION_RATE_LIMITS.commentsPerMinute,
      perDay: COURSE_DISCUSSION_RATE_LIMITS.commentsPerDay,
      fingerprint: discussionFingerprint(document),
    },
  );
  if (!rateLimit.ok) return rateLimit;
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("pdr", clock),
    schoolId: target.product.schoolId,
    productId: target.product.id,
    entityType: "lesson" as const,
    entityId: target.lesson.id,
    commentId: comment.id,
    parentReplyId,
    ...identityColumns(viewer),
    content: JSON.stringify(document),
    likesCount: 0,
    deletedAt: null,
    deletedBy: null,
    deletedByRole: null,
    deleteReason: null,
    restoredAt: null,
    restoredBy: null,
    isEdited: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction(async (tx) => {
    await tx.insert(schema.productDiscussionReplies).values(row);
    await upsertSummary(
      tx,
      target,
      {
        commentsDelta: 0,
        repliesDelta: 1,
        activityDelta: 1,
        now,
        replyId: row.publicId,
      },
      clock,
    );
    await ensureSubscriber(tx, target, viewer, clock);
  });
  await notifyDiscussionLearners(
    db,
    target,
    viewer,
    {
      type: "course_discussion_comment_created",
      title: "New discussion reply",
      body: `Someone replied to a discussion in “${target.product.title}”.`,
      href: `/dashboard/courses/${encodeURIComponent(target.product.publicId)}/${encodeURIComponent(target.lesson.publicId)}#discussion-reply-${encodeURIComponent(row.publicId)}`,
    },
    clock,
    comment.learnerId ? [comment.learnerId] : [],
  );
  await recordActivity(db, {
    schoolId: target.product.schoolId,
    actorId: viewer.kind === "learner" ? viewer.learnerId : viewer.context.principalId,
    type: ActivityType.COURSE_DISCUSSION_COMMENT_CREATED,
    entityId: row.publicId,
    metadata: {
      productId: target.product.publicId,
      lessonId: target.lesson.publicId,
      entityType: "reply",
      commentId: comment.publicId,
    },
  }, clock);
  return { ok: true, value: await replyDto(db, row, target, viewer, comment.publicId) };
}

export async function updateDiscussionReply(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  replyPublicId: string,
  content: unknown,
  clock: Clock,
): Promise<Result<ProductDiscussionReplyDto>> {
  const document = validateDiscussionContent(content);
  if (!document) return invalid();
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const row = await replyForTarget(db, targetResult.value, replyPublicId);
  if (!row) return notFound();
  if (!owns(viewer, row) || row.deletedAt) return forbidden();
  const comment = await db
    .select({ publicId: schema.productDiscussionComments.publicId })
    .from(schema.productDiscussionComments)
    .where(eq(schema.productDiscussionComments.id, row.commentId))
    .limit(1);
  if (!comment[0]) return notFound();
  const now = clock.now();
  await db
    .update(schema.productDiscussionReplies)
    .set({ content: JSON.stringify(document), isEdited: true, updatedAt: now })
    .where(eq(schema.productDiscussionReplies.id, row.id));
  return {
    ok: true,
    value: await replyDto(
      db,
      { ...row, content: JSON.stringify(document), isEdited: true, updatedAt: now },
      targetResult.value,
      viewer,
      comment[0].publicId,
    ),
  };
}

export async function deleteDiscussionReply(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  replyPublicId: string,
  clock: Clock,
): Promise<Result<{ id: string }>> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const row = await replyForTarget(db, targetResult.value, replyPublicId);
  if (!row) return notFound();
  if (!owns(viewer, row) || row.deletedAt) return forbidden();
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.productDiscussionReplies)
      .set({
        deletedAt: now,
        deletedBy:
          viewer.kind === "learner"
            ? viewer.learnerPublicId
            : viewer.context.principalId,
        deletedByRole: "author",
        updatedAt: now,
      })
      .where(eq(schema.productDiscussionReplies.id, row.id));
    await upsertSummary(
      tx,
      targetResult.value,
      {
        commentsDelta: 0,
        repliesDelta: -1,
        activityDelta: 0,
        now,
      },
      clock,
    );
  });
  return { ok: true, value: { id: row.publicId } };
}

async function discussionContentRow(
  db: AppDb,
  target: Target,
  contentType: ContentType,
  publicId: string,
) {
  if (contentType === "comment") {
    const comment = await commentForTarget(db, target, publicId);
    return comment ? { row: comment, commentId: comment.id } : null;
  }
  const reply = await replyForTarget(db, target, publicId);
  return reply ? { row: reply, commentId: reply.commentId } : null;
}

export async function toggleDiscussionLike(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  contentType: ContentType,
  contentPublicId: string,
  clock: Clock,
): Promise<
  Result<{
    contentType: ContentType;
    contentId: string;
    active: boolean;
    likesCount: number;
  }>
> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const target = targetResult.value;
  const content = await discussionContentRow(db, target, contentType, contentPublicId);
  if (!content || content.row.deletedAt) return notFound();
  const rateLimit = await enforceDiscussionRateLimit(
    db,
    viewer,
    target,
    "like:toggle",
    clock,
    { perMinute: COURSE_DISCUSSION_RATE_LIMITS.likesPerMinute },
  );
  if (!rateLimit.ok) return rateLimit;
  const identity = identityColumns(viewer);
  const existing = await db
    .select({ id: schema.productDiscussionLikes.id })
    .from(schema.productDiscussionLikes)
    .where(
      and(
        eq(schema.productDiscussionLikes.contentType, contentType),
        eq(schema.productDiscussionLikes.contentId, content.row.id),
        viewer.kind === "learner"
          ? eq(schema.productDiscussionLikes.learnerId, viewer.learnerId)
          : eq(schema.productDiscussionLikes.adminUserId, viewer.context.principalId),
      ),
    )
    .limit(1);
  const now = clock.now();
  let active: boolean;
  if (existing[0]) {
    await db
      .delete(schema.productDiscussionLikes)
      .where(eq(schema.productDiscussionLikes.id, existing[0].id));
    active = false;
  } else {
    await db.insert(schema.productDiscussionLikes).values({
      id: uuidv7(clock),
      publicId: createPublicId("pdl", clock),
      schoolId: target.product.schoolId,
      productId: target.product.id,
      entityType: "lesson",
      entityId: target.lesson.id,
      contentType,
      contentId: content.row.id,
      commentId: content.commentId,
      ...identity,
      createdAt: now,
    });
    active = true;
  }
  const table =
    contentType === "comment"
      ? schema.productDiscussionComments
      : schema.productDiscussionReplies;
  const updated = await db
    .update(table)
    .set({ likesCount: sql`${table.likesCount} ${active ? sql`+ 1` : sql`- 1`}` })
    .where(eq(table.id, content.row.id))
    .returning({ likesCount: table.likesCount });
  if (
    active &&
    content.row.learnerId &&
    (viewer.kind !== "learner" || content.row.learnerId !== viewer.learnerId)
  ) {
    await createLearnerNotification(
      db,
      { schoolId: target.product.schoolId, learnerId: content.row.learnerId },
      {
        type: "course_discussion_reacted",
        title: "New discussion reaction",
        body: "Someone reacted to your course discussion.",
        href: `/dashboard/courses/${encodeURIComponent(target.product.publicId)}/${encodeURIComponent(target.lesson.publicId)}#${contentType === "comment" ? "discussion-comment" : "discussion-reply"}-${encodeURIComponent(content.row.publicId)}`,
      },
      clock,
    );
  }
  if (active) {
    await recordActivity(db, {
      schoolId: target.product.schoolId,
      actorId: viewer.kind === "learner" ? viewer.learnerId : viewer.context.principalId,
      type: ActivityType.COURSE_DISCUSSION_REACTED,
      entityId: content.row.publicId,
      metadata: { productId: target.product.publicId, entityType: contentType },
    }, clock);
  }
  return {
    ok: true,
    value: {
      contentType,
      contentId: contentPublicId,
      active,
      likesCount: updated[0]?.likesCount ?? 0,
    },
  };
}

export async function toggleDiscussionSubscription(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  subscription: boolean,
  clock: Clock,
): Promise<Result<{ active: boolean }>> {
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const target = targetResult.value;
  const identity = identityColumns(viewer);
  const existing = await db
    .select({ id: schema.productDiscussionSubscribers.id })
    .from(schema.productDiscussionSubscribers)
    .where(
      and(
        eq(schema.productDiscussionSubscribers.productId, target.product.id),
        eq(schema.productDiscussionSubscribers.entityType, "lesson"),
        eq(schema.productDiscussionSubscribers.entityId, target.lesson.id),
        viewer.kind === "learner"
          ? eq(schema.productDiscussionSubscribers.learnerId, viewer.learnerId)
          : eq(
              schema.productDiscussionSubscribers.adminUserId,
              viewer.context.principalId,
            ),
      ),
    )
    .limit(1);
  const now = clock.now();
  if (existing[0]) {
    await db
      .update(schema.productDiscussionSubscribers)
      .set({ subscription, updatedAt: now })
      .where(eq(schema.productDiscussionSubscribers.id, existing[0].id));
  } else {
    await db.insert(schema.productDiscussionSubscribers).values({
      id: uuidv7(clock),
      publicId: createPublicId("pds", clock),
      schoolId: target.product.schoolId,
      productId: target.product.id,
      entityType: "lesson",
      entityId: target.lesson.id,
      ...identity,
      subscription,
      createdAt: now,
      updatedAt: now,
    });
  }
  return { ok: true, value: { active: subscription } };
}

async function contentPreview(
  db: AppDb,
  report: typeof schema.productDiscussionReports.$inferSelect,
): Promise<string | null> {
  const rows =
    report.contentType === "comment"
      ? await db
          .select({ content: schema.productDiscussionComments.content })
          .from(schema.productDiscussionComments)
          .where(eq(schema.productDiscussionComments.id, report.contentId))
          .limit(1)
      : await db
          .select({ content: schema.productDiscussionReplies.content })
          .from(schema.productDiscussionReplies)
          .where(eq(schema.productDiscussionReplies.id, report.contentId))
          .limit(1);
  if (!rows[0]) return null;
  try {
    return contentText(JSON.parse(rows[0].content)).trim().slice(0, 500) || null;
  } catch {
    return null;
  }
}

async function notifyDiscussionLearners(
  db: AppDb,
  target: Target,
  actor: DiscussionViewer,
  input: {
    type: "course_discussion_comment_created" | "course_discussion_reacted";
    title: string;
    body: string;
    href?: string;
  },
  clock: Clock,
  additionalLearnerIds: string[] = [],
) {
  const subscribers = await db
    .select({ learnerId: schema.productDiscussionSubscribers.learnerId })
    .from(schema.productDiscussionSubscribers)
    .where(
      and(
        eq(schema.productDiscussionSubscribers.schoolId, target.product.schoolId),
        eq(schema.productDiscussionSubscribers.productId, target.product.id),
        eq(schema.productDiscussionSubscribers.entityType, "lesson"),
        eq(schema.productDiscussionSubscribers.entityId, target.lesson.id),
        eq(schema.productDiscussionSubscribers.subscription, true),
      ),
    );
  const recipientIds = new Set(
    subscribers
      .map((subscriber) => subscriber.learnerId)
      .filter((learnerId): learnerId is string => learnerId !== null),
  );
  for (const learnerId of additionalLearnerIds) recipientIds.add(learnerId);
  if (actor.kind === "learner") recipientIds.delete(actor.learnerId);
  if (recipientIds.size === 0) return;

  const href =
    input.href ??
    `/dashboard/courses/${encodeURIComponent(target.product.publicId)}/${encodeURIComponent(target.lesson.publicId)}`;
  await Promise.all(
    [...recipientIds].map((learnerId) =>
      createLearnerNotification(
        db,
        { schoolId: target.product.schoolId, learnerId },
        { ...input, href },
        clock,
      ),
    ),
  );
}

async function reportDto(
  db: AppDb,
  row: typeof schema.productDiscussionReports.$inferSelect,
): Promise<ProductDiscussionReportDto> {
  const [product, lesson, publicId, preview, content] = await Promise.all([
    db
      .select({ publicId: schema.products.publicId })
      .from(schema.products)
      .where(eq(schema.products.id, row.productId))
      .limit(1),
    db
      .select({ publicId: schema.lessons.publicId, title: schema.lessons.title })
      .from(schema.lessons)
      .where(eq(schema.lessons.id, row.entityId))
      .limit(1),
    learnerPublicId(db, row.learnerId),
    contentPreview(db, row),
    row.contentType === "comment"
      ? db
          .select({
            publicId: schema.productDiscussionComments.publicId,
            learnerId: schema.productDiscussionComments.learnerId,
            adminUserId: schema.productDiscussionComments.adminUserId,
            deletedAt: schema.productDiscussionComments.deletedAt,
          })
          .from(schema.productDiscussionComments)
          .where(eq(schema.productDiscussionComments.id, row.contentId))
          .limit(1)
      : db
          .select({
            publicId: schema.productDiscussionReplies.publicId,
            learnerId: schema.productDiscussionReplies.learnerId,
            adminUserId: schema.productDiscussionReplies.adminUserId,
            deletedAt: schema.productDiscussionReplies.deletedAt,
          })
          .from(schema.productDiscussionReplies)
          .where(eq(schema.productDiscussionReplies.id, row.contentId))
          .limit(1),
  ]);
  const authorPublicId = await learnerPublicId(db, content[0]?.learnerId ?? null);
  const comment = row.commentId
    ? await db
        .select({ publicId: schema.productDiscussionComments.publicId })
        .from(schema.productDiscussionComments)
        .where(eq(schema.productDiscussionComments.id, row.commentId))
        .limit(1)
    : [];
  return {
    id: row.publicId,
    productId: product[0]?.publicId ?? row.productId,
    entityType: "lesson",
    entityId: lesson[0]?.publicId ?? row.entityId,
    contentType: row.contentType,
    contentId: content[0]?.publicId ?? row.contentId,
    commentId: comment[0]?.publicId ?? null,
    reporterId: row.learnerId ? (publicId ?? null) : row.adminUserId,
    reporterKind: row.learnerId ? "learner" : row.adminUserId ? "admin" : null,
    authorId: content[0]?.learnerId
      ? (authorPublicId ?? null)
      : (content[0]?.adminUserId ?? null),
    authorKind: content[0]?.learnerId
      ? "learner"
      : content[0]?.adminUserId
        ? "admin"
        : null,
    reason: row.reason,
    status: row.status,
    rejectionReason: row.rejectionReason,
    lessonTitle: lesson[0]?.title ?? "Unknown lesson",
    contentPreview: preview,
    contentDeleted: Boolean(content[0]?.deletedAt),
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

export async function createDiscussionReport(
  db: AppDb,
  viewer: DiscussionViewer,
  productPublicId: string,
  lessonPublicId: string,
  contentType: ContentType,
  contentPublicId: string,
  reason: string,
  clock: Clock,
): Promise<Result<ProductDiscussionReportDto>> {
  if (!reason.trim() || reason.length > 2000) return invalid();
  const targetResult = await resolveTarget(
    db,
    viewer,
    productPublicId,
    lessonPublicId,
    clock.now(),
  );
  if (!targetResult.ok) return targetResult;
  const target = targetResult.value;
  const content = await discussionContentRow(db, target, contentType, contentPublicId);
  if (!content || content.row.deletedAt) return notFound();
  const rateLimit = await enforceDiscussionRateLimit(
    db,
    viewer,
    target,
    "report:create",
    clock,
    {
      perHour: COURSE_DISCUSSION_RATE_LIMITS.reportsPerHour,
    },
  );
  if (!rateLimit.ok) return rateLimit;
  const identity = identityColumns(viewer);
  const duplicate = await db
    .select({ id: schema.productDiscussionReports.id })
    .from(schema.productDiscussionReports)
    .where(
      and(
        eq(schema.productDiscussionReports.contentType, contentType),
        eq(schema.productDiscussionReports.contentId, content.row.id),
        viewer.kind === "learner"
          ? eq(schema.productDiscussionReports.learnerId, viewer.learnerId)
          : eq(schema.productDiscussionReports.adminUserId, viewer.context.principalId),
      ),
    )
    .limit(1);
  if (duplicate[0]) return { ok: false, error: createPlatformError("conflict") };
  const now = clock.now();
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("pdt", clock),
    schoolId: target.product.schoolId,
    productId: target.product.id,
    entityType: "lesson" as const,
    entityId: target.lesson.id,
    contentType,
    contentId: content.row.id,
    commentId: content.commentId,
    ...identity,
    reason: reason.trim(),
    status: "pending" as const,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(schema.productDiscussionReports).values(row);
  return { ok: true, value: await reportDto(db, row) };
}

export async function listDiscussionReports(
  db: AppDb,
  context: AdminContext,
  productPublicId: string,
  input: {
    status?: "pending" | "accepted" | "rejected";
    cursor?: string;
    limit?: number;
  },
): Promise<
  Result<{
    items: ProductDiscussionReportDto[];
    nextCursor: string | null;
    hasMore: boolean;
  }>
> {
  if (!adminCan(context, "products:write")) return forbidden();
  const products = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, context.tenantId!),
        eq(schema.products.publicId, productPublicId),
        eq(schema.products.kind, "course"),
      ),
    )
    .limit(1);
  if (!products[0]) return notFound();
  const cursor = decodeCursor(input.cursor);
  if (input.cursor && !cursor) return invalid();
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);
  const filters = [
    eq(schema.productDiscussionReports.schoolId, context.tenantId!),
    eq(schema.productDiscussionReports.productId, products[0].id),
    ...(input.status ? [eq(schema.productDiscussionReports.status, input.status)] : []),
  ];
  if (cursor) {
    filters.push(
      or(
        lt(schema.productDiscussionReports.createdAt, cursor.date),
        and(
          eq(schema.productDiscussionReports.createdAt, cursor.date),
          lt(schema.productDiscussionReports.publicId, cursor.id),
        ),
      )!,
    );
  }
  const rows = await db
    .select()
    .from(schema.productDiscussionReports)
    .where(and(...filters))
    .orderBy(
      desc(schema.productDiscussionReports.createdAt),
      desc(schema.productDiscussionReports.publicId),
    )
    .limit(limit + 1);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    ok: true,
    value: {
      items: await Promise.all(page.map((row) => reportDto(db, row))),
      nextCursor: hasMore
        ? encodeCursor(
            page[page.length - 1]!.createdAt,
            page[page.length - 1]!.publicId,
          )
        : null,
      hasMore,
    },
  };
}

export async function updateDiscussionReport(
  db: AppDb,
  context: AdminContext,
  reportPublicId: string,
  status: "pending" | "accepted" | "rejected",
  rejectionReason: string | null | undefined,
  clock: Clock,
): Promise<Result<ProductDiscussionReportDto>> {
  if (!adminCan(context, "products:write")) return forbidden();
  const reports = await db
    .select()
    .from(schema.productDiscussionReports)
    .where(
      and(
        eq(schema.productDiscussionReports.schoolId, context.tenantId!),
        eq(schema.productDiscussionReports.publicId, reportPublicId),
      ),
    )
    .limit(1);
  const report = reports[0];
  if (!report) return notFound();
  if (
    status === "rejected" &&
    rejectionReason !== undefined &&
    rejectionReason !== null &&
    rejectionReason.length > 2000
  )
    return invalid();
  const now = clock.now();
  await db.transaction(async (tx) => {
    await tx
      .update(schema.productDiscussionReports)
      .set({
        status,
        rejectionReason: status === "rejected" ? rejectionReason?.trim() || null : null,
        updatedAt: now,
      })
      .where(eq(schema.productDiscussionReports.id, report.id));
    if (status === "accepted") {
      const table =
        report.contentType === "comment"
          ? schema.productDiscussionComments
          : schema.productDiscussionReplies;
      const contentRows = await tx
        .select({ deletedAt: table.deletedAt })
        .from(table)
        .where(eq(table.id, report.contentId))
        .limit(1);
      if (!contentRows[0]) return;
      if (report.status !== "accepted" && !contentRows[0].deletedAt) {
        await tx
          .update(table)
          .set({
            deletedAt: now,
            deletedBy: context.principalId,
            deletedByRole: "moderator",
            deleteReason: report.reason,
            updatedAt: now,
          })
          .where(eq(table.id, report.contentId));
        await tx
          .update(schema.productDiscussionSummaries)
          .set({
            totalCount: sql`GREATEST(${schema.productDiscussionSummaries.totalCount} - 1, 0)`,
            ...(report.contentType === "comment"
              ? {
                  commentsCount: sql`GREATEST(${schema.productDiscussionSummaries.commentsCount} - 1, 0)`,
                }
              : {
                  repliesCount: sql`GREATEST(${schema.productDiscussionSummaries.repliesCount} - 1, 0)`,
                }),
            updatedAt: now,
          })
          .where(
            and(
              eq(schema.productDiscussionSummaries.schoolId, report.schoolId),
              eq(schema.productDiscussionSummaries.productId, report.productId),
              eq(schema.productDiscussionSummaries.entityType, report.entityType),
              eq(schema.productDiscussionSummaries.entityId, report.entityId),
            ),
          );
      }
    } else if (report.status === "accepted") {
      const otherAccepted = await tx
        .select({ id: schema.productDiscussionReports.id })
        .from(schema.productDiscussionReports)
        .where(
          and(
            eq(schema.productDiscussionReports.contentType, report.contentType),
            eq(schema.productDiscussionReports.contentId, report.contentId),
            eq(schema.productDiscussionReports.status, "accepted"),
            ne(schema.productDiscussionReports.id, report.id),
          ),
        )
        .limit(1);
      if (!otherAccepted[0]) {
        const table =
          report.contentType === "comment"
            ? schema.productDiscussionComments
            : schema.productDiscussionReplies;
        const contentRows = await tx
          .select({ deletedAt: table.deletedAt })
          .from(table)
          .where(eq(table.id, report.contentId))
          .limit(1);
        if (contentRows[0]?.deletedAt) {
          await tx
            .update(table)
            .set({
              deletedAt: null,
              deletedBy: null,
              deletedByRole: null,
              deleteReason: null,
              restoredAt: now,
              restoredBy: context.principalId,
              updatedAt: now,
            })
            .where(eq(table.id, report.contentId));
          await tx
            .update(schema.productDiscussionSummaries)
            .set({
              totalCount: sql`${schema.productDiscussionSummaries.totalCount} + 1`,
              ...(report.contentType === "comment"
                ? {
                    commentsCount: sql`${schema.productDiscussionSummaries.commentsCount} + 1`,
                  }
                : {
                    repliesCount: sql`${schema.productDiscussionSummaries.repliesCount} + 1`,
                  }),
              updatedAt: now,
            })
            .where(
              and(
                eq(schema.productDiscussionSummaries.schoolId, report.schoolId),
                eq(schema.productDiscussionSummaries.productId, report.productId),
                eq(schema.productDiscussionSummaries.entityType, report.entityType),
                eq(schema.productDiscussionSummaries.entityId, report.entityId),
              ),
            );
        }
      }
    }
  });
  return {
    ok: true,
    value: await reportDto(db, {
      ...report,
      status,
      rejectionReason: status === "rejected" ? rejectionReason?.trim() || null : null,
      updatedAt: now,
    }),
  };
}
