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
  emptyLessonDocument,
  hasLessonQuiz,
  type LearnerLessonDocument,
  lessonMarkdown,
  lessonMediaUses,
  mediaMatchesAcceptedTypes,
  prepareLessonContent,
  stripLessonAnswers,
} from "@courselit/lesson-content";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  checkLessonMedia,
  type LessonType,
  lessonContentError,
  lessonTypeAllowed,
  lessonValidationError,
} from "./lesson-pages.js";
import { reconcileMediaReferencesInTransaction } from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import { type ProductDto, productFeaturedImageFor } from "./products.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

/** A lesson in a list: neither content form (section 7). */
export type LessonSummaryDto = {
  id: string;
  title: string;
  type: LessonType;
  mediaId: string | null;
  sectionId: string | null;
  position: number;
  status: "draft" | "published";
  requiresEnrollment: boolean;
  contentVersion: number;
  dripDelaySeconds: number | null;
  dripAt: string | null;
  availableAt: string | null;
  publishedAt: string | null;
};

/**
 * One lesson as its authors read and write it, with the page as JSON and as
 * Markdown. Both hold the quiz's correct answers: admin responses only.
 */
export type LessonDto = LessonSummaryDto & {
  content: Record<string, unknown>;
  markdown: string | null;
};

/**
 * A lesson as learners, the public and previews read it. A page comes from
 * `stripLessonAnswers`, so its Quiz blocks have no `correct` field, and
 * there is no Markdown form (L1).
 */
export type LearnerLessonDto = Omit<LessonSummaryDto, "contentVersion"> & {
  content: LearnerLessonDocument | Record<string, unknown> | null;
};

export type SectionDto = {
  id: string;
  title: string;
  position: number;
  dripEnabled: boolean;
  dripType: "relative-date" | "exact-date" | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
};

export type ProductDetailDto = ProductDto & {
  enrolled: boolean;
  sections: SectionDto[];
  lessons: LessonSummaryDto[];
};

export type LearnerProductDetailDto = ProductDto & {
  enrolled: boolean;
  sections: SectionDto[];
  lessons: LearnerLessonDto[];
};

/** Everyone who reads a product without authoring it. */
export type LearnerFacingViewer =
  | { kind: "preview" }
  | { kind: "learner"; schoolAccountId?: string; learnerId?: string }
  | { kind: "public" };

export type ProductViewer = { kind: "admin" } | LearnerFacingViewer;

async function productToDto(
  db: AppDb,
  row: typeof schema.products.$inferSelect,
  publicSchoolId: string,
  featuredImage: ProductDto["featuredImage"],
): Promise<ProductDto> {
  const discussionSpace = row.discussionSpaceId
    ? (
        await db
          .select({ publicId: schema.spaces.publicId })
          .from(schema.spaces)
          .where(eq(schema.spaces.id, row.discussionSpaceId))
          .limit(1)
      )[0]
    : null;
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    kind: row.kind,
    status: row.status,
    slug: row.slug,
    title: row.title,
    description: row.description,
    featuredImage,
    privacy: row.privacy,
    leadMagnet: row.leadMagnet,
    certificate: row.certificate,
    discussions: row.discussions,
    includedWithCommunity: row.includedWithCommunity,
    discussionSpaceId: discussionSpace?.publicId ?? null,
    publishedAt: row.publishedAt ? serializeDate(row.publishedAt) : null,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function lessonToDto(
  row: typeof schema.lessons.$inferSelect,
  sectionPublicId: string | null = null,
  availableAt: Date | null = null,
  mediaId: string | null = null,
): LessonSummaryDto {
  return {
    id: row.publicId,
    title: row.title,
    type: row.type,
    mediaId,
    sectionId: sectionPublicId,
    position: row.position,
    status: row.status,
    requiresEnrollment: row.requiresEnrollment,
    contentVersion: row.contentVersion,
    dripDelaySeconds: row.dripDelaySeconds,
    dripAt: row.dripAt ? serializeDate(row.dripAt) : null,
    availableAt: availableAt ? serializeDate(availableAt) : null,
    publishedAt: row.publishedAt ? serializeDate(row.publishedAt) : null,
  };
}

/** The single-lesson admin read and write response: content, Markdown and version. */
export function lessonDetailToDto(
  row: typeof schema.lessons.$inferSelect,
  sectionPublicId: string | null,
  mediaId: string | null,
): LessonDto {
  return {
    ...lessonToDto(row, sectionPublicId, null, mediaId),
    content: row.content,
    markdown: row.type === "page" ? lessonMarkdown(row.content) : null,
  };
}

/**
 * Lesson content for anyone who doesn't author it: a page loses its quiz
 * answers (`stripLessonAnswers`, L1). SCORM and file lessons hold no answers.
 */
export function learnerLessonContent(
  row: Pick<typeof schema.lessons.$inferSelect, "type" | "content">,
): LearnerLessonDto["content"] {
  if (row.type === "page") return stripLessonAnswers(row.content);
  return row.content;
}

function learnerLessonToDto(
  row: typeof schema.lessons.$inferSelect,
  includeContent: boolean,
  sectionPublicId: string | null,
  availableAt: Date | null,
  mediaId: string | null,
): LearnerLessonDto {
  const { contentVersion: _version, ...lesson } = lessonToDto(
    row,
    sectionPublicId,
    availableAt,
    mediaId,
  );
  return { ...lesson, content: includeContent ? learnerLessonContent(row) : null };
}

export function lessonUnlockAt(
  lesson: Pick<typeof schema.lessons.$inferSelect, "dripDelaySeconds" | "dripAt">,
  enrollmentStartedAt: Date,
): Date | null {
  const relative =
    lesson.dripDelaySeconds === null
      ? null
      : new Date(enrollmentStartedAt.getTime() + lesson.dripDelaySeconds * 1000);
  if (!relative) return lesson.dripAt;
  if (!lesson.dripAt) return relative;
  return relative > lesson.dripAt ? relative : lesson.dripAt;
}

function sectionToDto(row: typeof schema.productSections.$inferSelect): SectionDto {
  return {
    id: row.publicId,
    title: row.title,
    position: row.position,
    dripEnabled: row.dripEnabled,
    dripType: row.dripType,
    dripDelaySeconds: row.dripDelaySeconds,
    dripAt: row.dripAt ? serializeDate(row.dripAt) : null,
  };
}

type SectionDripInput = {
  dripEnabled?: boolean;
  dripType?: "relative-date" | "exact-date" | null;
  dripDelaySeconds?: number | null;
  dripAt?: Date | null;
};

type LessonMediaRecord = Pick<
  typeof schema.media.$inferSelect,
  "fileName" | "mimeType"
>;

/** The uploaded file of a SCORM or file lesson; pages reference media in their blocks. */
function lessonMediaValidation(
  lessonType: LessonType,
  media: LessonMediaRecord,
): { ok: true } | { ok: false; error: PlatformError } {
  const acceptedTypes: readonly string[] | null =
    lessonType === "scorm"
      ? [
          ".zip",
          "application/zip",
          "application/x-zip-compressed",
          "application/octet-stream",
        ]
      : lessonType === "file"
        ? ["*/*"]
        : null;
  if (acceptedTypes && mediaMatchesAcceptedTypes(media, acceptedTypes)) {
    return { ok: true };
  }
  return lessonValidationError(
    acceptedTypes ? "lesson_media_type_mismatch" : "lesson_media_not_allowed",
  );
}

type PageWrite = {
  content?: Record<string, unknown>;
  markdown?: string;
};

/**
 * Checks a lesson write's content (section 4.3). Pages take `content` or
 * `markdown` and are validated against the lesson profile and the stored
 * version (`previous`, for availability). SCORM lessons take their package
 * details as JSON `content`; file lessons hold no content. A page that is or becomes published must be complete,
 * and a page with a quiz can't be a free preview: grading needs a learner.
 */
export function prepareLessonWrite(input: {
  type: LessonType;
  write: PageWrite;
  /** Stored content; null on create. */
  stored: Record<string, unknown> | null;
  status: "draft" | "published";
  requiresEnrollment: boolean;
  unavailable?: Record<string, string>;
}):
  | { ok: true; content: Record<string, unknown> }
  | { ok: false; error: PlatformError } {
  const sent = input.write.content !== undefined || input.write.markdown !== undefined;
  if (input.type === "scorm") {
    // A SCORM lesson's content is its processed package's details (launch
    // URL, title), written as JSON after `processScormPackage`.
    if (input.write.markdown !== undefined) {
      return lessonValidationError("lesson_content_not_allowed");
    }
    return { ok: true, content: input.write.content ?? input.stored ?? {} };
  }
  if (input.type === "file") {
    if (sent) return lessonValidationError("lesson_content_not_allowed");
    return { ok: true, content: input.stored ?? {} };
  }
  let content: Record<string, unknown>;
  if (sent) {
    const prepared = prepareLessonContent(
      input.write.markdown !== undefined
        ? { markdown: input.write.markdown }
        : { content: input.write.content },
      {
        previous: input.stored ?? emptyLessonDocument(),
        unavailable: input.unavailable,
      },
    );
    if (!prepared.ok)
      return { ok: false, error: lessonContentError(prepared.diagnostics) };
    if (input.status === "published" && prepared.incomplete.length) {
      return { ok: false, error: lessonContentError(prepared.incomplete) };
    }
    content = prepared.content as Record<string, unknown>;
  } else {
    content = input.stored ?? emptyLessonDocument();
    if (input.status === "published") {
      const stored = prepareLessonContent({ content }, { previous: content });
      if (stored.ok && stored.incomplete.length) {
        return { ok: false, error: lessonContentError(stored.incomplete) };
      }
    }
  }
  if (!input.requiresEnrollment && hasLessonQuiz(content)) {
    return lessonValidationError("quiz_cannot_be_previewed");
  }
  return { ok: true, content };
}

/** Records the media a page uses in `media_references` (L5), after checking it. */
async function syncPageMedia(
  tx: AppDb,
  ctx: Ctx,
  lesson: { id: string; publicId: string; type: LessonType },
  content: Record<string, unknown>,
  clock: Clock,
): Promise<void> {
  const uses = lesson.type === "page" ? lessonMediaUses(content) : [];
  const checked = await checkLessonMedia(tx, ctx.tenantId!, uses);
  if (!checked.ok) throw new RollbackWith(checked);
  const references = await reconcileMediaReferencesInTransaction(
    tx,
    ctx.tenantId!,
    checked.mediaIds,
    "lesson_content",
    lesson.id,
    lesson.publicId,
    clock,
    { allowedKinds: ["image", "video", "audio", "document", "other"] },
  );
  if (!references.ok) throw new RollbackWith(references);
}

/** JSON equality that ignores key order (jsonb doesn't keep it). */
export function sameJson(left: unknown, right: unknown): boolean {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, canonical((value as Record<string, unknown>)[key])]),
      );
    }
    return value;
  };
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

type Failure = { ok: false; error: PlatformError };

function contentVersionConflict(currentVersion: number | null): Failure {
  return {
    ok: false,
    error: createPlatformError("conflict", {
      safeDetails: {
        reason: "content_version_mismatch",
        ...(currentVersion === null ? {} : { contentVersion: currentVersion }),
      },
    }),
  };
}

/** Thrown inside a transaction to roll back its writes and return `result`. */
class RollbackWith extends Error {
  constructor(readonly result: Failure) {
    super("transaction rolled back");
  }
}

async function transactionResult<T>(
  db: AppDb,
  run: (tx: AppDb) => Promise<T>,
): Promise<T | Failure> {
  try {
    return await db.transaction((tx) => run(tx as unknown as AppDb));
  } catch (caught) {
    if (caught instanceof RollbackWith) return caught.result;
    throw caught;
  }
}

function normalizeSectionDrip(
  input: SectionDripInput,
  existing?: Pick<
    typeof schema.productSections.$inferSelect,
    "dripEnabled" | "dripType" | "dripDelaySeconds" | "dripAt"
  >,
):
  | {
      ok: true;
      value: {
        dripEnabled: boolean;
        dripType: "relative-date" | "exact-date" | null;
        dripDelaySeconds: number | null;
        dripAt: Date | null;
      };
    }
  | { ok: false } {
  const explicitType = input.dripType !== undefined;
  const dripType = explicitType
    ? (input.dripType ?? null)
    : (existing?.dripType ?? null);
  const dripEnabled = input.dripEnabled ?? existing?.dripEnabled ?? false;

  // Clearing the release type also clears the values belonging to the old
  // release mode. This keeps PATCH convenient and satisfies the database
  // invariant below without making clients send redundant nulls.
  if (explicitType && input.dripType === null) {
    return {
      ok: true,
      value: {
        dripEnabled,
        dripType: null,
        dripDelaySeconds: null,
        dripAt: null,
      },
    };
  }

  const dripDelaySeconds =
    input.dripDelaySeconds === undefined
      ? (existing?.dripDelaySeconds ?? null)
      : input.dripDelaySeconds;
  const dripAt = input.dripAt === undefined ? (existing?.dripAt ?? null) : input.dripAt;

  if (
    (dripType === null && (dripDelaySeconds !== null || dripAt !== null)) ||
    (dripType === "relative-date" && (dripDelaySeconds === null || dripAt !== null)) ||
    (dripType === "exact-date" && (dripDelaySeconds !== null || dripAt === null))
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    value: { dripEnabled, dripType, dripDelaySeconds, dripAt },
  };
}

function latestDate(...dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, null);
}

function sectionUnlockTimes(
  rows: (typeof schema.productSections.$inferSelect)[],
  enrollmentStartedAt: Date | null,
): Map<string, Date | null> {
  const result = new Map<string, Date | null>();
  let relativeCursor = enrollmentStartedAt;

  for (const row of rows) {
    if (!row.dripEnabled || !row.dripType) {
      result.set(row.id, null);
      continue;
    }
    if (row.dripType === "exact-date") {
      result.set(row.id, row.dripAt);
      continue;
    }
    if (relativeCursor && row.dripDelaySeconds !== null) {
      relativeCursor = new Date(relativeCursor.getTime() + row.dripDelaySeconds * 1000);
    }
    result.set(row.id, relativeCursor);
  }

  return result;
}

export function sectionUnlockAt(
  rows: (typeof schema.productSections.$inferSelect)[],
  sectionId: string,
  enrollmentStartedAt: Date,
): Date | null {
  return sectionUnlockTimes(rows, enrollmentStartedAt).get(sectionId) ?? null;
}

export async function getProduct(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  productPublicId: string,
  viewer: { kind: "admin" },
  now?: Date,
): Promise<{ ok: true; value: ProductDetailDto } | { ok: false; error: PlatformError }>;
export async function getProduct(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  productPublicId: string,
  viewer: LearnerFacingViewer,
  now?: Date,
): Promise<
  { ok: true; value: LearnerProductDetailDto } | { ok: false; error: PlatformError }
>;
export async function getProduct(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  productPublicId: string,
  viewer: ProductViewer,
  now = new Date(),
): Promise<
  | { ok: true; value: ProductDetailDto | LearnerProductDetailDto }
  | { ok: false; error: PlatformError }
> {
  const existing = await db
    .select()
    .from(schema.products)
    .where(
      and(
        or(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.slug, productPublicId),
        ),
        eq(schema.products.schoolId, school.schoolId),
      ),
    )
    .limit(1);
  const product = existing[0];
  if (!product) {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const hasAuthoringAccess = viewer.kind === "admin" || viewer.kind === "preview";
  if (!hasAuthoringAccess && product.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const lessonRows = await db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.productId, product.id))
    .orderBy(asc(schema.lessons.position));
  const sectionRows = await db
    .select()
    .from(schema.productSections)
    .where(eq(schema.productSections.productId, product.id))
    .orderBy(asc(schema.productSections.position));
  const sectionPublicIds = new Map(
    sectionRows.map((section) => [section.id, section.publicId]),
  );
  const mediaByLessonInternalId = new Map<string, string>();
  if (lessonRows.length > 0) {
    const mediaRows = await db
      .select({
        lessonInternalId: schema.mediaReferences.resourceInternalId,
        mediaPublicId: schema.media.publicId,
      })
      .from(schema.mediaReferences)
      .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
      .where(
        and(
          eq(schema.mediaReferences.schoolId, school.schoolId),
          eq(schema.mediaReferences.resourceType, "lesson_media"),
          inArray(
            schema.mediaReferences.resourceInternalId,
            lessonRows.map((lesson) => lesson.id),
          ),
          eq(schema.media.status, "active"),
        ),
      );
    for (const mediaRow of mediaRows) {
      mediaByLessonInternalId.set(mediaRow.lessonInternalId, mediaRow.mediaPublicId);
    }
  }
  let enrolled = false;
  let membershipStartedAt: Date | null = null;
  if (viewer.kind === "learner") {
    const schoolAccountId = viewer.schoolAccountId ?? viewer.learnerId;
    const memberships = schoolAccountId
      ? await db
          .select({ createdAt: schema.learnerMemberships.createdAt })
          .from(schema.learnerMemberships)
          .where(
            and(
              eq(schema.learnerMemberships.schoolAccountId, schoolAccountId),
              eq(schema.learnerMemberships.entityType, "product"),
              eq(schema.learnerMemberships.entityId, product.publicId),
              eq(schema.learnerMemberships.schoolId, school.schoolId),
              eq(schema.learnerMemberships.status, "active"),
            ),
          )
          .limit(1)
      : [];
    enrolled = Boolean(memberships[0]);
    membershipStartedAt = memberships[0]?.createdAt ?? null;
  }
  const visible = hasAuthoringAccess
    ? lessonRows
    : lessonRows.filter((row) => row.status === "published");
  const visibleSectionIds = new Set(
    visible.flatMap((lesson) => (lesson.sectionId ? [lesson.sectionId] : [])),
  );
  const visibleSections = hasAuthoringAccess
    ? sectionRows
    : sectionRows.filter((section) => visibleSectionIds.has(section.id));
  const featuredImage = await productFeaturedImageFor(db, product);
  const sectionUnlocks = sectionUnlockTimes(sectionRows, membershipStartedAt);
  const productDto = await productToDto(db, product, school.publicId, featuredImage);
  const lessons = visible.map((row) => {
    const section = row.sectionId
      ? sectionRows.find((candidate) => candidate.id === row.sectionId)
      : undefined;
    const sectionDripAt = row.sectionId
      ? (sectionUnlocks.get(row.sectionId) ?? null)
      : null;
    const availableAt = latestDate(
      membershipStartedAt && row.status === "published"
        ? lessonUnlockAt(row, membershipStartedAt)
        : row.dripAt,
      sectionDripAt,
    );
    const sectionAvailable =
      !section?.dripEnabled ||
      (enrolled && Boolean(sectionDripAt) && sectionDripAt! <= now);
    const lessonAvailable =
      !row.requiresEnrollment || (enrolled && (!availableAt || availableAt <= now));
    /*
     * Section drips are an access boundary in their own right. A public
     * lesson must not bypass a scheduled section simply because the
     * lesson itself does not require enrollment.
     */
    const contentAvailable =
      hasAuthoringAccess ||
      (row.status === "published" && sectionAvailable && lessonAvailable);
    return {
      row,
      contentAvailable,
      sectionPublicId: row.sectionId
        ? (sectionPublicIds.get(row.sectionId) ?? null)
        : null,
      availableAt,
      mediaId: contentAvailable ? (mediaByLessonInternalId.get(row.id) ?? null) : null,
    };
  });
  const base = { ...productDto, enrolled, sections: visibleSections.map(sectionToDto) };
  if (viewer.kind === "admin") {
    return {
      ok: true,
      value: {
        ...base,
        lessons: lessons.map((lesson) =>
          lessonToDto(
            lesson.row,
            lesson.sectionPublicId,
            lesson.availableAt,
            lesson.mediaId,
          ),
        ),
      },
    };
  }
  // Previews read like learners: authoring access shows drafts and locked
  // lessons, never the answers (L1).
  return {
    ok: true,
    value: {
      ...base,
      lessons: lessons.map((lesson) =>
        learnerLessonToDto(
          lesson.row,
          lesson.contentAvailable,
          lesson.sectionPublicId,
          lesson.availableAt,
          lesson.mediaId,
        ),
      ),
    },
  };
}

export async function createLesson(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  input: {
    title: string;
    type?: LessonType;
    content?: Record<string, unknown>;
    markdown?: string;
    mediaId?: string | null;
    requiresEnrollment?: boolean;
    status?: "draft" | "published";
    sectionId?: string;
    dripDelaySeconds?: number | null;
    dripAt?: Date | null;
    /** Blocks the school may not add now (`lessonBlockAvailability`). */
    unavailable?: Record<string, string>;
  },
  clock: Clock,
): Promise<{ ok: true; value: LessonDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const type = input.type ?? "page";
  if (type === "page" && input.mediaId) {
    return lessonValidationError("lesson_media_not_allowed");
  }
  return transactionResult(db, async (tx) => {
    const products = await tx
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.publicId, productPublicId),
          eq(schema.products.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    if (!lessonTypeAllowed(product.kind, type)) {
      return lessonValidationError("lesson_type_not_allowed");
    }
    const status = input.status ?? "draft";
    const requiresEnrollment = input.requiresEnrollment ?? true;
    const contentCheck = prepareLessonWrite({
      type,
      write: input,
      stored: null,
      status,
      requiresEnrollment,
      unavailable: input.unavailable,
    });
    if (!contentCheck.ok) return contentCheck;
    const content = contentCheck.content;
    let sectionId: string | null = null;
    let sectionPublicId: string | null = null;
    if (input.sectionId) {
      const sections = await tx
        .select({
          id: schema.productSections.id,
          publicId: schema.productSections.publicId,
        })
        .from(schema.productSections)
        .where(
          and(
            eq(schema.productSections.publicId, input.sectionId),
            eq(schema.productSections.productId, product.id),
            eq(schema.productSections.schoolId, ctx.tenantId!),
          ),
        )
        .limit(1);
      const section = sections[0];
      if (!section) {
        return { ok: false as const, error: createPlatformError("not_found") };
      }
      sectionId = section.id;
      sectionPublicId = section.publicId;
    }
    const existing = await tx
      .select({ position: schema.lessons.position })
      .from(schema.lessons)
      .where(eq(schema.lessons.productId, product.id));
    const position = existing.reduce((max, row) => Math.max(max, row.position), 0) + 1;
    const now = clock.now();
    const row = {
      id: uuidv7(clock),
      publicId: createPublicId("lsn", clock),
      schoolId: ctx.tenantId!,
      productId: product.id,
      sectionId,
      title: input.title,
      type,
      content,
      contentVersion: 1,
      requiresEnrollment,
      status,
      position,
      dripDelaySeconds: input.dripDelaySeconds ?? null,
      dripAt: input.dripAt ?? null,
      publishedAt: status === "published" ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    let mediaInternalId: string | null = null;
    if (input.mediaId) {
      const media = await tx
        .select({
          id: schema.media.id,
          fileName: schema.media.fileName,
          mimeType: schema.media.mimeType,
        })
        .from(schema.media)
        .where(
          and(
            eq(schema.media.publicId, input.mediaId),
            eq(schema.media.schoolId, ctx.tenantId!),
            eq(schema.media.status, "active"),
          ),
        )
        .limit(1);
      if (!media[0])
        return { ok: false as const, error: createPlatformError("not_found") };
      const mediaCheck = lessonMediaValidation(row.type, media[0]);
      if (!mediaCheck.ok) return mediaCheck;
      mediaInternalId = media[0].id;
    }
    await tx.insert(schema.lessons).values(row);
    if (mediaInternalId) {
      await tx.insert(schema.mediaReferences).values({
        id: uuidv7(clock),
        schoolId: ctx.tenantId!,
        mediaId: mediaInternalId,
        resourceType: "lesson_media",
        resourceInternalId: row.id,
        resourcePublicId: row.publicId,
        parentResourceInternalId: null,
        parentResourcePublicId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    await syncPageMedia(tx, ctx, row, content, clock);
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "lesson.created",
      resourceType: "lesson",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: lessonDetailToDto(row, sectionPublicId, input.mediaId ?? null),
    };
  });
}

export async function updateLesson(
  db: AppDb,
  ctx: Ctx,
  lessonPublicId: string,
  input: {
    title?: string;
    content?: Record<string, unknown>;
    markdown?: string;
    expectedContentVersion?: number;
    mediaId?: string | null;
    requiresEnrollment?: boolean;
    status?: "draft" | "published";
    sectionId?: string | null;
    dripDelaySeconds?: number | null;
    dripAt?: Date | null;
    /** Blocks the school may not add now (`lessonBlockAvailability`). */
    unavailable?: Record<string, string>;
  },
  clock: Clock,
): Promise<{ ok: true; value: LessonDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return transactionResult(db, async (tx) => {
    const existing = await tx
      .select()
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.publicId, lessonPublicId),
          eq(schema.lessons.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const requiresEnrollment =
      input.requiresEnrollment === undefined
        ? row.requiresEnrollment
        : input.requiresEnrollment;
    const contentSent = input.content !== undefined || input.markdown !== undefined;
    // A content write names the version it is based on, so an agent and a
    // person editing the same lesson can't silently overwrite each other.
    if (contentSent && input.expectedContentVersion === undefined) {
      return lessonValidationError("expected_content_version_required");
    }
    if (row.type === "page" && input.mediaId) {
      return lessonValidationError("lesson_media_not_allowed");
    }
    const contentCheck = prepareLessonWrite({
      type: row.type,
      write: input,
      stored: row.content,
      status: input.status ?? row.status,
      requiresEnrollment,
      unavailable: input.unavailable,
    });
    if (!contentCheck.ok) return contentCheck;
    const content = contentCheck.content;
    if (
      input.expectedContentVersion !== undefined &&
      input.expectedContentVersion !== row.contentVersion
    ) {
      return contentVersionConflict(row.contentVersion);
    }
    const contentChanged = contentSent && !sameJson(content, row.content);
    let sectionId = row.sectionId;
    let sectionPublicId: string | null = null;
    if (input.sectionId !== undefined) {
      if (input.sectionId === null) {
        sectionId = null;
      } else {
        const sections = await tx
          .select({
            id: schema.productSections.id,
            publicId: schema.productSections.publicId,
          })
          .from(schema.productSections)
          .where(
            and(
              eq(schema.productSections.publicId, input.sectionId),
              eq(schema.productSections.productId, row.productId),
              eq(schema.productSections.schoolId, ctx.tenantId!),
            ),
          )
          .limit(1);
        const section = sections[0];
        if (!section) {
          return { ok: false as const, error: createPlatformError("not_found") };
        }
        sectionId = section.id;
        sectionPublicId = section.publicId;
      }
    }
    if (sectionPublicId === null && sectionId) {
      const sections = await tx
        .select({ publicId: schema.productSections.publicId })
        .from(schema.productSections)
        .where(eq(schema.productSections.id, sectionId))
        .limit(1);
      sectionPublicId = sections[0]?.publicId ?? null;
    }
    const now = clock.now();
    const status = input.status ?? row.status;
    const next = {
      title: input.title ?? row.title,
      content,
      contentVersion: contentChanged ? row.contentVersion + 1 : row.contentVersion,
      requiresEnrollment,
      status,
      publishedAt: status === "published" ? (row.publishedAt ?? now) : null,
      sectionId,
      dripDelaySeconds:
        input.dripDelaySeconds === undefined
          ? row.dripDelaySeconds
          : input.dripDelaySeconds,
      dripAt: input.dripAt === undefined ? row.dripAt : input.dripAt,
      updatedAt: now,
    };
    let mediaPublicId: string | null = null;
    if (input.mediaId !== undefined) {
      let mediaInternalId: string | null = null;
      if (input.mediaId) {
        const media = await tx
          .select({
            id: schema.media.id,
            publicId: schema.media.publicId,
            fileName: schema.media.fileName,
            mimeType: schema.media.mimeType,
          })
          .from(schema.media)
          .where(
            and(
              eq(schema.media.publicId, input.mediaId),
              eq(schema.media.schoolId, ctx.tenantId!),
              eq(schema.media.status, "active"),
            ),
          )
          .limit(1);
        if (!media[0]) {
          return { ok: false as const, error: createPlatformError("not_found") };
        }
        const mediaCheck = lessonMediaValidation(row.type, media[0]);
        if (!mediaCheck.ok) return mediaCheck;
        mediaInternalId = media[0].id;
        mediaPublicId = media[0].publicId;
      }
      await tx
        .delete(schema.mediaReferences)
        .where(
          and(
            eq(schema.mediaReferences.schoolId, ctx.tenantId!),
            eq(schema.mediaReferences.resourceType, "lesson_media"),
            eq(schema.mediaReferences.resourceInternalId, row.id),
          ),
        );
      if (mediaInternalId) {
        await tx.insert(schema.mediaReferences).values({
          id: uuidv7(clock),
          schoolId: ctx.tenantId!,
          mediaId: mediaInternalId,
          resourceType: "lesson_media",
          resourceInternalId: row.id,
          resourcePublicId: row.publicId,
          parentResourceInternalId: null,
          parentResourcePublicId: null,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      const media = await tx
        .select({ publicId: schema.media.publicId })
        .from(schema.mediaReferences)
        .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
        .where(
          and(
            eq(schema.mediaReferences.schoolId, ctx.tenantId!),
            eq(schema.mediaReferences.resourceType, "lesson_media"),
            eq(schema.mediaReferences.resourceInternalId, row.id),
            eq(schema.media.status, "active"),
          ),
        )
        .limit(1);
      mediaPublicId = media[0]?.publicId ?? null;
    }
    if (contentSent) await syncPageMedia(tx, ctx, row, content, clock);
    // The version check and the write are one statement (L2): a concurrent
    // content write between our read and this update matches no row.
    const updated = await tx
      .update(schema.lessons)
      .set({
        ...next,
        contentVersion: contentChanged
          ? sql`${schema.lessons.contentVersion} + 1`
          : schema.lessons.contentVersion,
      })
      .where(
        and(
          eq(schema.lessons.id, row.id),
          eq(schema.lessons.contentVersion, row.contentVersion),
        ),
      )
      .returning({ contentVersion: schema.lessons.contentVersion });
    if (!updated[0]) {
      throw new RollbackWith(contentVersionConflict(null));
    }
    next.contentVersion = updated[0].contentVersion;
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action:
        status === "published" && row.status !== "published"
          ? "lesson.published"
          : "lesson.updated",
      resourceType: "lesson",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return {
      ok: true as const,
      value: lessonDetailToDto({ ...row, ...next }, sectionPublicId, mediaPublicId),
    };
  });
}

/** One lesson for its authors: content, Markdown and version (section 7). */
export async function getLesson(
  db: AppDb,
  ctx: Ctx,
  lessonPublicId: string,
): Promise<{ ok: true; value: LessonDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:read") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const [row] = await db
    .select()
    .from(schema.lessons)
    .where(
      and(
        eq(schema.lessons.publicId, lessonPublicId),
        eq(schema.lessons.schoolId, ctx.tenantId),
      ),
    )
    .limit(1);
  if (!row) return { ok: false, error: createPlatformError("not_found") };
  const [section] = row.sectionId
    ? await db
        .select({ publicId: schema.productSections.publicId })
        .from(schema.productSections)
        .where(eq(schema.productSections.id, row.sectionId))
        .limit(1)
    : [];
  const [media] = await db
    .select({ publicId: schema.media.publicId })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, ctx.tenantId),
        eq(schema.mediaReferences.resourceType, "lesson_media"),
        eq(schema.mediaReferences.resourceInternalId, row.id),
        eq(schema.media.status, "active"),
      ),
    )
    .limit(1);
  return {
    ok: true,
    value: lessonDetailToDto(row, section?.publicId ?? null, media?.publicId ?? null),
  };
}

export async function deleteLesson(
  db: AppDb,
  ctx: Ctx,
  lessonPublicId: string,
  clock: Clock,
): Promise<{ ok: true; value: { id: string } } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.publicId, lessonPublicId),
          eq(schema.lessons.schoolId, ctx.tenantId!),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }

    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, ctx.tenantId!),
          eq(schema.mediaReferences.resourceType, "lesson_media"),
          eq(schema.mediaReferences.resourceInternalId, row.id),
        ),
      );
    await tx
      .delete(schema.mediaReferences)
      .where(
        and(
          eq(schema.mediaReferences.schoolId, ctx.tenantId!),
          eq(schema.mediaReferences.resourceType, "lesson_content"),
          eq(schema.mediaReferences.resourceInternalId, row.id),
        ),
      );
    await tx.delete(schema.lessons).where(eq(schema.lessons.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "lesson.deleted",
      resourceType: "lesson",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: clock.now(),
    });
    return { ok: true as const, value: { id: row.publicId } };
  });
}

async function productForSchool(db: AppDb, schoolId: string, productPublicId: string) {
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.schoolId, schoolId),
        eq(schema.products.publicId, productPublicId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function listSections(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
): Promise<{ ok: true; value: SectionDto[] } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:read") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const product = await productForSchool(db, ctx.tenantId, productPublicId);
  if (!product) return { ok: false, error: createPlatformError("not_found") };
  const rows = await db
    .select()
    .from(schema.productSections)
    .where(eq(schema.productSections.productId, product.id))
    .orderBy(asc(schema.productSections.position));
  return { ok: true, value: rows.map(sectionToDto) };
}

export async function createSection(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  input: SectionDripInput & { title: string },
  clock: Clock,
): Promise<{ ok: true; value: SectionDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const products = await tx
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, ctx.tenantId!),
          eq(schema.products.publicId, productPublicId),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const drip = normalizeSectionDrip(input);
    if (!drip.ok) {
      return { ok: false as const, error: createPlatformError("validation_failed") };
    }
    const existing = await tx
      .select({ position: schema.productSections.position })
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, product.id));
    const position = existing.reduce((max, row) => Math.max(max, row.position), 0) + 1;
    const now = clock.now();
    const row = {
      id: uuidv7(clock),
      publicId: createPublicId("sec", clock),
      schoolId: ctx.tenantId!,
      productId: product.id,
      title: input.title,
      position,
      ...drip.value,
      createdBy: ctx.principalId,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(schema.productSections).values(row);
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "section.created",
      resourceType: "product_section",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return { ok: true as const, value: sectionToDto(row) };
  });
}

export async function updateSection(
  db: AppDb,
  ctx: Ctx,
  sectionPublicId: string,
  input: SectionDripInput & { title?: string },
  clock: Clock,
): Promise<{ ok: true; value: SectionDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.productSections)
      .where(
        and(
          eq(schema.productSections.schoolId, ctx.tenantId!),
          eq(schema.productSections.publicId, sectionPublicId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };
    const drip = normalizeSectionDrip(input, row);
    if (!drip.ok) {
      return { ok: false as const, error: createPlatformError("validation_failed") };
    }
    const now = clock.now();
    const next = { title: input.title ?? row.title, ...drip.value, updatedAt: now };
    await tx
      .update(schema.productSections)
      .set(next)
      .where(eq(schema.productSections.id, row.id));
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "section.updated",
      resourceType: "product_section",
      resourceId: row.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return { ok: true as const, value: sectionToDto({ ...row, ...next }) };
  });
}

export async function deleteSection(
  db: AppDb,
  ctx: Ctx,
  sectionPublicId: string,
  clock: Clock,
): Promise<{ ok: true; value: { id: string } } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        section: schema.productSections,
        productKind: schema.products.kind,
      })
      .from(schema.productSections)
      .innerJoin(
        schema.products,
        eq(schema.products.id, schema.productSections.productId),
      )
      .where(
        and(
          eq(schema.productSections.schoolId, ctx.tenantId!),
          eq(schema.productSections.publicId, sectionPublicId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return { ok: false as const, error: createPlatformError("not_found") };

    const sections = await tx
      .select({ id: schema.productSections.id })
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, row.section.productId));
    if (row.productKind === "download" && sections.length === 1) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "download_last_section" },
        }),
      };
    }

    const lessons = await tx
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.productId, row.section.productId),
          eq(schema.lessons.sectionId, row.section.id),
        ),
      )
      .limit(1);
    if (lessons.length > 0) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "section_not_empty" },
        }),
      };
    }

    await tx
      .delete(schema.productSections)
      .where(eq(schema.productSections.id, row.section.id));

    // Keep positions contiguous after a deletion while avoiding the unique
    // (product_id, position) index during the two-phase rewrite.
    const remaining = await tx
      .select({ id: schema.productSections.id })
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, row.section.productId))
      .orderBy(asc(schema.productSections.position));
    for (const [index, section] of remaining.entries()) {
      await tx
        .update(schema.productSections)
        .set({ position: -(index + 1) })
        .where(eq(schema.productSections.id, section.id));
    }
    const now = clock.now();
    for (const [index, section] of remaining.entries()) {
      await tx
        .update(schema.productSections)
        .set({ position: index + 1, updatedAt: now })
        .where(eq(schema.productSections.id, section.id));
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "section.deleted",
      resourceType: "product_section",
      resourceId: row.section.publicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    return { ok: true as const, value: { id: row.section.publicId } };
  });
}

export async function reorderSections(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  sectionPublicIds: readonly string[],
  clock: Clock,
): Promise<{ ok: true; value: SectionDto[] } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const products = await tx
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, ctx.tenantId!),
          eq(schema.products.publicId, productPublicId),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const sections = await tx
      .select()
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, product.id));
    const knownIds = new Set(sections.map((section) => section.publicId));
    const requestedIds = new Set(sectionPublicIds);
    if (
      requestedIds.size !== sections.length ||
      sectionPublicIds.length !== sections.length ||
      [...requestedIds].some((id) => !knownIds.has(id))
    ) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "section_order_must_be_complete" },
        }),
      };
    }
    for (const [index, section] of sections.entries()) {
      await tx
        .update(schema.productSections)
        .set({ position: -(index + 1) })
        .where(eq(schema.productSections.id, section.id));
    }
    const now = clock.now();
    for (const [index, sectionPublicId] of sectionPublicIds.entries()) {
      await tx
        .update(schema.productSections)
        .set({ position: index + 1, updatedAt: now })
        .where(
          and(
            eq(schema.productSections.productId, product.id),
            eq(schema.productSections.publicId, sectionPublicId),
          ),
        );
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "section.reordered",
      resourceType: "product",
      resourceId: productPublicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    const reordered = await tx
      .select()
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, product.id))
      .orderBy(asc(schema.productSections.position));
    return { ok: true as const, value: reordered.map(sectionToDto) };
  });
}

export async function reorderLessons(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  lessonPublicIds: readonly string[],
  sectionAssignments:
    | readonly { lessonId: string; sectionId: string | null }[]
    | undefined,
  clock: Clock,
): Promise<
  { ok: true; value: LessonSummaryDto[] } | { ok: false; error: PlatformError }
> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  return db.transaction(async (tx) => {
    const products = await tx
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, ctx.tenantId!),
          eq(schema.products.publicId, productPublicId),
        ),
      )
      .limit(1);
    const product = products[0];
    if (!product) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    const lessons = await tx
      .select()
      .from(schema.lessons)
      .where(eq(schema.lessons.productId, product.id));
    const knownIds = new Set(lessons.map((lesson) => lesson.publicId));
    const requestedIds = new Set(lessonPublicIds);
    if (
      requestedIds.size !== lessons.length ||
      lessonPublicIds.length !== lessons.length ||
      [...requestedIds].some((id) => !knownIds.has(id))
    ) {
      return {
        ok: false as const,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "lesson_order_must_be_complete" },
        }),
      };
    }

    const sections = await tx
      .select()
      .from(schema.productSections)
      .where(eq(schema.productSections.productId, product.id));
    const sectionByPublicId = new Map(sections.map((s) => [s.publicId, s.id]));

    if (sectionAssignments && sectionAssignments.length > 0) {
      for (const assignment of sectionAssignments) {
        if (!knownIds.has(assignment.lessonId)) {
          return {
            ok: false as const,
            error: createPlatformError("validation_failed", {
              safeDetails: { reason: "unknown_lesson_in_assignment" },
            }),
          };
        }
        let internalSectionId: string | null = null;
        if (assignment.sectionId !== null) {
          internalSectionId = sectionByPublicId.get(assignment.sectionId) ?? null;
          if (!internalSectionId) {
            return {
              ok: false as const,
              error: createPlatformError("not_found", {
                safeDetails: { reason: "section_not_found" },
              }),
            };
          }
        }
        await tx
          .update(schema.lessons)
          .set({ sectionId: internalSectionId })
          .where(
            and(
              eq(schema.lessons.productId, product.id),
              eq(schema.lessons.publicId, assignment.lessonId),
            ),
          );
      }
    }

    for (const [index, lesson] of lessons.entries()) {
      await tx
        .update(schema.lessons)
        .set({ position: -(index + 1) })
        .where(eq(schema.lessons.id, lesson.id));
    }
    const now = clock.now();
    for (const [index, lessonPublicId] of lessonPublicIds.entries()) {
      await tx
        .update(schema.lessons)
        .set({ position: index + 1, updatedAt: now })
        .where(
          and(
            eq(schema.lessons.productId, product.id),
            eq(schema.lessons.publicId, lessonPublicId),
          ),
        );
    }
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: ctx.tenantId,
      actorId: ctx.principalId,
      action: "lesson.reordered",
      resourceType: "product",
      resourceId: productPublicId,
      requestId: ctx.requestId,
      createdAt: now,
    });
    const reordered = await tx
      .select()
      .from(schema.lessons)
      .where(eq(schema.lessons.productId, product.id))
      .orderBy(asc(schema.lessons.position));

    const sectionPublicIds = new Map(sections.map((s) => [s.id, s.publicId]));
    return {
      ok: true as const,
      value: reordered.map((l) =>
        lessonToDto(
          l,
          l.sectionId ? (sectionPublicIds.get(l.sectionId) ?? null) : null,
        ),
      ),
    };
  });
}
