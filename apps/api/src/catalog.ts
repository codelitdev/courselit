import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  type PlatformRequestContext,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import {
  mediaIdsForRichTextContent,
  reconcileMediaReferencesInTransaction,
} from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import { type ProductDto, productFeaturedImageFor } from "./products.js";
import type { AppDb } from "./types.js";

type Ctx = PlatformRequestContext<string, string, CourseLitPermission>;

export type LessonDto = {
  id: string;
  title: string;
  type: "text" | "video" | "audio" | "pdf" | "file" | "embed" | "quiz" | "scorm";
  mediaId: string | null;
  sectionId: string | null;
  position: number;
  status: "draft" | "published";
  downloadable: boolean;
  requiresEnrollment: boolean;
  content: Record<string, unknown> | null;
  dripDelaySeconds: number | null;
  dripAt: string | null;
  availableAt: string | null;
  publishedAt: string | null;
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
  lessons: LessonDto[];
};

export type ProductViewer =
  | { kind: "admin" }
  | { kind: "preview" }
  | { kind: "learner"; schoolAccountId?: string; learnerId?: string }
  | { kind: "public" };

function productToDto(
  row: typeof schema.products.$inferSelect,
  publicSchoolId: string,
  featuredImage: ProductDto["featuredImage"],
): ProductDto {
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
    discussionSpaceId: row.discussionSpaceId,
    publishedAt: row.publishedAt ? serializeDate(row.publishedAt) : null,
    createdAt: serializeDate(row.createdAt),
    updatedAt: serializeDate(row.updatedAt),
  };
}

function lessonToDto(
  row: typeof schema.lessons.$inferSelect,
  includeContent: boolean,
  sectionPublicId: string | null = null,
  availableAt: Date | null = null,
  mediaId: string | null = null,
  stripQuizAnswers = false,
): LessonDto {
  const content =
    includeContent && stripQuizAnswers && row.type === "quiz"
      ? learnerQuizContent(row.content)
      : row.content;
  return {
    id: row.publicId,
    title: row.title,
    type: row.type,
    mediaId,
    sectionId: sectionPublicId,
    position: row.position,
    status: row.status,
    downloadable: row.downloadable,
    requiresEnrollment: row.requiresEnrollment,
    content: includeContent ? content : null,
    dripDelaySeconds: row.dripDelaySeconds,
    dripAt: row.dripAt ? serializeDate(row.dripAt) : null,
    availableAt: availableAt ? serializeDate(availableAt) : null,
    publishedAt: row.publishedAt ? serializeDate(row.publishedAt) : null,
  };
}

function learnerQuizContent(content: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(content.questions)) return content;
  return {
    ...content,
    questions: content.questions.flatMap((question) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) {
        return [];
      }
      const value = question as Record<string, unknown>;
      const options = Array.isArray(value.options)
        ? value.options.flatMap((option) => {
            if (!option || typeof option !== "object" || Array.isArray(option)) {
              return [];
            }
            const optionValue = option as Record<string, unknown>;
            return typeof optionValue.text === "string"
              ? [{ text: optionValue.text }]
              : [];
          })
        : [];
      const correctCount = Array.isArray(value.options)
        ? value.options.filter(
            (option) =>
              option &&
              typeof option === "object" &&
              !Array.isArray(option) &&
              (option as Record<string, unknown>).correctAnswer === true,
          ).length
        : 0;
      return [
        {
          text: typeof value.text === "string" ? value.text : "",
          type: correctCount > 1 ? "multiple" : "single",
          options,
        },
      ];
    }),
  };
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

function lessonContentError(reason: string): {
  ok: false;
  error: PlatformError;
} {
  return {
    ok: false,
    error: createPlatformError("validation_failed", {
      safeDetails: { reason },
    }),
  };
}

type LessonMediaType = typeof schema.lessons.$inferInsert.type;
type LessonMediaRecord = Pick<
  typeof schema.media.$inferSelect,
  "fileName" | "mimeType"
>;

function mediaMatchesAcceptedTypes(
  media: LessonMediaRecord,
  acceptedTypes: readonly string[],
): boolean {
  const mimeType = media.mimeType.toLowerCase().trim();
  const fileName = media.fileName.toLowerCase().trim();
  const extension = fileName.slice(fileName.lastIndexOf("."));
  return acceptedTypes.some((pattern) => {
    const normalized = pattern.toLowerCase().trim();
    if (normalized === "*" || normalized === "*/*") return true;
    if (normalized.startsWith(".")) return extension === normalized;
    if (normalized.endsWith("/*")) {
      return mimeType.startsWith(normalized.slice(0, -1));
    }
    if (mimeType === normalized) return true;
    return normalized === "application/pdf" && extension === ".pdf";
  });
}

function lessonMediaValidation(
  lessonType: LessonMediaType,
  media: LessonMediaRecord,
): { ok: true } | { ok: false; error: PlatformError } {
  const acceptedTypes: readonly string[] | null =
    lessonType === "video"
      ? ["video/*"]
      : lessonType === "audio"
        ? ["audio/*"]
        : lessonType === "pdf"
          ? ["application/pdf", ".pdf"]
          : lessonType === "scorm"
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
  return lessonContentError(
    acceptedTypes ? "lesson_media_type_mismatch" : "lesson_media_not_allowed",
  );
}

/**
 * Keep the server-side lesson checks aligned with the production lesson
 * validator. The admin editor performs the same checks for immediate
 * feedback, but REST and MCP callers must not be able to persist an invalid
 * quiz or an empty embed.
 */
function validateLessonContent(input: {
  type?: typeof schema.lessons.$inferInsert.type;
  content: Record<string, unknown>;
  requiresEnrollment?: boolean;
}): { ok: true } | { ok: false; error: PlatformError } {
  if (input.type === "embed") {
    if (typeof input.content.value !== "string" || !input.content.value.trim()) {
      return lessonContentError("embed_content_required");
    }
  }
  if (input.type !== "quiz") return { ok: true };
  if (input.requiresEnrollment === false) {
    return lessonContentError("quiz_cannot_be_previewed");
  }
  const questions = input.content.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    return lessonContentError("quiz_questions_required");
  }
  for (const questionValue of questions) {
    if (!questionValue || typeof questionValue !== "object") {
      return lessonContentError("quiz_question_text_required");
    }
    const question = questionValue as Record<string, unknown>;
    if (typeof question.text !== "string" || !question.text.trim()) {
      return lessonContentError("quiz_question_text_required");
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      return lessonContentError("quiz_options_required");
    }
    if (
      question.options.some(
        (option) => {
          if (!option || typeof option !== "object") return true;
          const optionText = (option as Record<string, unknown>).text;
          return typeof optionText !== "string" || !optionText.trim();
        },
      )
    ) {
      return lessonContentError("quiz_option_text_required");
    }
    if (
      !question.options.some(
        (option) =>
          option &&
          typeof option === "object" &&
          (option as Record<string, unknown>).correctAnswer === true,
      )
    ) {
      return lessonContentError("quiz_correct_answer_required");
    }
  }
  return { ok: true };
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
    ? input.dripType ?? null
    : existing?.dripType ?? null;
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
      ? existing?.dripDelaySeconds ?? null
      : input.dripDelaySeconds;
  const dripAt = input.dripAt === undefined ? existing?.dripAt ?? null : input.dripAt;

  if (
    (dripType === null && (dripDelaySeconds !== null || dripAt !== null)) ||
    (dripType === "relative-date" &&
      (dripDelaySeconds === null || dripAt !== null)) ||
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
  rows: typeof schema.productSections.$inferSelect[],
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
      relativeCursor = new Date(
        relativeCursor.getTime() + row.dripDelaySeconds * 1000,
      );
    }
    result.set(row.id, relativeCursor);
  }

  return result;
}

export function sectionUnlockAt(
  rows: typeof schema.productSections.$inferSelect[],
  sectionId: string,
  enrollmentStartedAt: Date,
): Date | null {
  return sectionUnlockTimes(rows, enrollmentStartedAt).get(sectionId) ?? null;
}

export async function getProduct(
  db: AppDb,
  school: { schoolId: string; publicId: string },
  productPublicId: string,
  viewer: ProductViewer,
  now = new Date(),
): Promise<
  { ok: true; value: ProductDetailDto } | { ok: false; error: PlatformError }
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
  return {
    ok: true,
    value: {
      ...productToDto(product, school.publicId, featuredImage),
      enrolled,
      sections: visibleSections.map(sectionToDto),
      lessons: visible.map((row) => {
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
          !row.requiresEnrollment ||
          (enrolled && (!availableAt || availableAt <= now));
        /*
         * Section drips are an access boundary in their own right. A public
         * lesson must not bypass a scheduled section simply because the
         * lesson itself does not require enrollment.
         */
        const contentAvailable =
          hasAuthoringAccess ||
          (row.status === "published" && sectionAvailable && lessonAvailable);
        return lessonToDto(
          row,
          contentAvailable,
          row.sectionId ? (sectionPublicIds.get(row.sectionId) ?? null) : null,
          availableAt,
          contentAvailable ? (mediaByLessonInternalId.get(row.id) ?? null) : null,
          viewer.kind === "learner",
        );
      }),
    },
  };
}

export async function createLesson(
  db: AppDb,
  ctx: Ctx,
  productPublicId: string,
  input: {
    title: string;
    type?: typeof schema.lessons.$inferInsert.type;
    content: Record<string, unknown>;
    mediaId?: string | null;
    downloadable?: boolean;
    requiresEnrollment?: boolean;
    status?: "draft" | "published";
    sectionId?: string;
    dripDelaySeconds?: number | null;
    dripAt?: Date | null;
  },
  clock: Clock,
): Promise<{ ok: true; value: LessonDto } | { ok: false; error: PlatformError }> {
  if (!ctx.permissions.has("products:write") || !ctx.tenantId) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const contentCheck = validateLessonContent(input);
  if (!contentCheck.ok) return contentCheck;
  return db.transaction(async (tx) => {
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
      type: input.type ?? "text",
      content: input.content,
      downloadable: input.downloadable ?? false,
      requiresEnrollment: input.requiresEnrollment ?? true,
      status: input.status ?? "draft",
      position,
      dripDelaySeconds: input.dripDelaySeconds ?? null,
      dripAt: input.dripAt ?? null,
      publishedAt: input.status === "published" ? now : null,
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
    {
      const contentMediaIds = await mediaIdsForRichTextContent(
        tx as AppDb,
        ctx.tenantId!,
        input.content,
      );
      const references = await reconcileMediaReferencesInTransaction(
        tx as AppDb,
        ctx.tenantId!,
        contentMediaIds,
        "lesson_content",
        row.id,
        row.publicId,
        clock,
      );
      if (!references.ok) return references;
    }
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
      value: lessonToDto(row, true, sectionPublicId, null, input.mediaId ?? null),
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
    mediaId?: string | null;
    downloadable?: boolean;
    requiresEnrollment?: boolean;
    status?: "draft" | "published";
    sectionId?: string | null;
    dripDelaySeconds?: number | null;
    dripAt?: Date | null;
  },
  clock: Clock,
): Promise<{ ok: true; value: LessonDto } | { ok: false; error: PlatformError }> {
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
    const contentCheck = validateLessonContent({
      type: row.type,
      content: input.content ?? row.content,
      requiresEnrollment:
        input.requiresEnrollment === undefined
          ? row.requiresEnrollment
          : input.requiresEnrollment,
    });
    if (!contentCheck.ok) return contentCheck;
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
      content: input.content ?? row.content,
      downloadable:
        input.downloadable === undefined ? row.downloadable : input.downloadable,
      requiresEnrollment:
        input.requiresEnrollment === undefined
          ? row.requiresEnrollment
          : input.requiresEnrollment,
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
    if (input.content !== undefined) {
      const contentMediaIds = await mediaIdsForRichTextContent(
        tx as AppDb,
        ctx.tenantId!,
        input.content,
      );
      const references = await reconcileMediaReferencesInTransaction(
        tx as AppDb,
        ctx.tenantId!,
        contentMediaIds,
        "lesson_content",
        row.id,
        row.publicId,
        clock,
      );
      if (!references.ok) return references;
    }
    await tx.update(schema.lessons).set(next).where(eq(schema.lessons.id, row.id));
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
      value: lessonToDto(
        { ...row, ...next },
        true,
        sectionPublicId,
        null,
        mediaPublicId,
      ),
    };
  });
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

    // Discussion entity IDs are intentionally not foreign keys because they
    // support both product and lesson targets. Remove those orphaned rows
    // before deleting the lesson itself.
    const lessonTarget = and(
      eq(schema.productDiscussionComments.schoolId, ctx.tenantId!),
      eq(schema.productDiscussionComments.entityType, "lesson"),
      eq(schema.productDiscussionComments.entityId, row.id),
    );
    await tx
      .delete(schema.productDiscussionReports)
      .where(
        and(
          eq(schema.productDiscussionReports.schoolId, ctx.tenantId!),
          eq(schema.productDiscussionReports.entityType, "lesson"),
          eq(schema.productDiscussionReports.entityId, row.id),
        ),
      );
    await tx
      .delete(schema.productDiscussionLikes)
      .where(
        and(
          eq(schema.productDiscussionLikes.schoolId, ctx.tenantId!),
          eq(schema.productDiscussionLikes.entityType, "lesson"),
          eq(schema.productDiscussionLikes.entityId, row.id),
        ),
      );
    await tx
      .delete(schema.productDiscussionSubscribers)
      .where(
        and(
          eq(schema.productDiscussionSubscribers.schoolId, ctx.tenantId!),
          eq(schema.productDiscussionSubscribers.entityType, "lesson"),
          eq(schema.productDiscussionSubscribers.entityId, row.id),
        ),
      );
    await tx
      .delete(schema.productDiscussionSummaries)
      .where(
        and(
          eq(schema.productDiscussionSummaries.schoolId, ctx.tenantId!),
          eq(schema.productDiscussionSummaries.entityType, "lesson"),
          eq(schema.productDiscussionSummaries.entityId, row.id),
        ),
      );
    await tx
      .delete(schema.productDiscussionReplies)
      .where(
        and(
          eq(schema.productDiscussionReplies.schoolId, ctx.tenantId!),
          eq(schema.productDiscussionReplies.entityType, "lesson"),
          eq(schema.productDiscussionReplies.entityId, row.id),
        ),
      );
    await tx.delete(schema.productDiscussionComments).where(lessonTarget);
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
      .innerJoin(schema.products, eq(schema.products.id, schema.productSections.productId))
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
): Promise<{ ok: true; value: LessonDto[] } | { ok: false; error: PlatformError }> {
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
        lessonToDto(l, false, l.sectionId ? sectionPublicIds.get(l.sectionId) ?? null : null),
      ),
    };
  });
}
