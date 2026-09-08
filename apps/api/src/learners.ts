import {
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, desc, eq, gt, isNotNull, isNull, lte, or } from "drizzle-orm";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import { issueCertificateIfComplete } from "./certificates.js";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import type { LearnerOtpDelivery } from "./deps.js";
import { normalizeEmail } from "./invitations.js";
import type { MediaLitClient } from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import type { ProductDto, ProductFeaturedMediaDto } from "./products.js";
import { loadSchoolByPublicId } from "./schools.js";
import { headerSchoolId } from "./school-context.js";
import { hostnameFromHeaders, schoolLookupKeyFromHost } from "./school-host.js";
import type { AppDb } from "./types.js";

export const LEARNER_SESSION_COOKIE = "courselit.learner.session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LEARNER_OTP_TTL_MS = 10 * 60 * 1000;
export const LEARNER_OTP_MAX_ATTEMPTS = 5;
export const LEARNER_IDENTITY_LINK_TTL_MS = 10 * 60 * 1000;

export type LearnerDto = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
};

export type AdminLearnerDto = LearnerDto & {
  status: "active" | "deactivated";
  createdAt: string;
};

export type EnrollmentDto = {
  id: string;
  schoolId: string;
  productId: string;
  source:
    | "free_signup"
    | "admin_grant"
    | "storefront_purchase"
    | "included_product"
    | "import"
    | "integration";
  status: "active" | "payment_failed" | "expired" | "pending" | "rejected" | "paused";
};

export type ProgressDto = {
  lessonId: string;
  enrollmentId: string;
  startedAt: string;
  completedAt: string;
  courseCompleted: boolean;
  certificateId: string | null;
};

export type LessonProgressDto = {
  lessonId: string;
  enrollmentId: string;
  startedAt: string;
  completedAt: string | null;
};

export type LearnerLessonMediaDto = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  byteSize: number;
};

export type LearnerProductDto = ProductDto & {
  totalLessons: number;
  completedLessonsCount: number;
  certificateId: string | null;
  downloaded: boolean;
};

export type LearnerOtpRequestDto = {
  expiresAt: string;
};

export type LearnerIdentityLinkDto = {
  token: string;
  expiresAt: string;
};

function latestUnlockAt(...dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, null);
}

async function sectionAccessForLesson(
  db: AppDb,
  lesson: typeof schema.lessons.$inferSelect,
  enrollmentStartedAt: Date,
): Promise<{ required: boolean; availableAt: Date | null }> {
  if (!lesson.sectionId) return { required: false, availableAt: null };
  const sections = await db
    .select()
    .from(schema.productSections)
    .where(eq(schema.productSections.productId, lesson.productId))
    .orderBy(asc(schema.productSections.position));
  const section = sections.find((candidate) => candidate.id === lesson.sectionId);
  if (!section?.dripEnabled) return { required: false, availableAt: null };
  return {
    required: true,
    availableAt: sectionUnlockAt(sections, section.id, enrollmentStartedAt),
  };
}

type LessonMediaViewer =
  | { kind: "public" }
  | { kind: "preview" }
  | { kind: "learner"; learnerId: string };

/**
 * Resolve a lesson asset only after applying the same visibility rules as the
 * learner product read. Private MediaLit assets are looked up server-side so
 * the browser never receives the MediaLit API key or its internal asset ID.
 */
export async function getLearnerLessonMedia(
  db: AppDb,
  client: MediaLitClient,
  input: {
    schoolId: string;
    productPublicId: string;
    lessonPublicId: string;
    viewer: LessonMediaViewer;
  },
  now: Date,
): Promise<
  { ok: true; value: LearnerLessonMediaDto } | { ok: false; error: PlatformError }
> {
  const rows = await db
    .select({ lesson: schema.lessons, product: schema.products })
    .from(schema.lessons)
    .innerJoin(schema.products, eq(schema.products.id, schema.lessons.productId))
    .where(
      and(
        eq(schema.lessons.schoolId, input.schoolId),
        eq(schema.lessons.publicId, input.lessonPublicId),
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.publicId, input.productPublicId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: createPlatformError("not_found") };

  const preview = input.viewer.kind === "preview";
  if (
    !preview &&
    (row.product.status !== "published" || row.lesson.status !== "published")
  ) {
    return { ok: false, error: createPlatformError("not_found") };
  }

  let enrolled = false;
  let enrollmentStartedAt: Date | null = null;
  if (input.viewer.kind === "learner") {
    const enrollments = await db
      .select({
        enrollmentCreatedAt: schema.enrollments.createdAt,
        grantStartsAt: schema.enrollmentAccessGrants.startsAt,
      })
      .from(schema.enrollments)
      .innerJoin(
        schema.enrollmentAccessGrants,
        eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
      )
      .where(
        and(
          eq(schema.enrollments.schoolId, input.schoolId),
          eq(schema.enrollments.learnerId, input.viewer.learnerId),
          eq(schema.enrollments.productId, row.product.id),
          eq(schema.enrollments.status, "active"),
          eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
          eq(schema.enrollmentAccessGrants.status, "active"),
          lte(schema.enrollmentAccessGrants.startsAt, now),
          or(
            isNull(schema.enrollmentAccessGrants.endsAt),
            gt(schema.enrollmentAccessGrants.endsAt, now),
          ),
        ),
      )
      .limit(1);
    const enrollment = enrollments[0];
    enrolled = Boolean(enrollment);
    if (enrollment) {
      enrollmentStartedAt =
        enrollment.enrollmentCreatedAt > enrollment.grantStartsAt
          ? enrollment.enrollmentCreatedAt
          : enrollment.grantStartsAt;
    }
  }

  const sections = row.lesson.sectionId
    ? await db
        .select()
        .from(schema.productSections)
        .where(eq(schema.productSections.productId, row.product.id))
        .orderBy(asc(schema.productSections.position))
    : [];
  const section = sections.find((candidate) => candidate.id === row.lesson.sectionId);
  const sectionDripAt =
    section && enrollmentStartedAt
      ? sectionUnlockAt(sections, section.id, enrollmentStartedAt)
      : null;
  const availableAt = latestUnlockAt(
    preview || !enrollmentStartedAt
      ? row.lesson.dripAt
      : lessonUnlockAt(row.lesson, enrollmentStartedAt),
    sectionDripAt,
  );
  const sectionAvailable =
    preview ||
    !section?.dripEnabled ||
    (enrolled && Boolean(sectionDripAt) && sectionDripAt! <= now);
  const lessonAvailable =
    preview ||
    !row.lesson.requiresEnrollment ||
    (enrolled && (!availableAt || availableAt <= now));
  if (!sectionAvailable || !lessonAvailable) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: {
          reason: availableAt && availableAt > now ? "lesson_locked" : "not_enrolled",
          availableAt: availableAt ? serializeDate(availableAt) : null,
        },
      }),
    };
  }

  const mediaRows = await db
    .select({ media: schema.media })
    .from(schema.mediaReferences)
    .innerJoin(schema.media, eq(schema.media.id, schema.mediaReferences.mediaId))
    .where(
      and(
        eq(schema.mediaReferences.schoolId, input.schoolId),
        eq(schema.mediaReferences.resourceType, "lesson_media"),
        eq(schema.mediaReferences.resourceInternalId, row.lesson.id),
        eq(schema.media.status, "active"),
      ),
    )
    .limit(1);
  const media = mediaRows[0]?.media;
  if (!media) return { ok: false, error: createPlatformError("not_found") };

  try {
    const privateAsset =
      media.accessPolicy === "private"
        ? await client.getAsset({
            schoolId: input.schoolId,
            mediaLitId: media.mediaLitId,
          })
        : null;
    const asset = privateAsset ?? {
      canonicalUrl: media.canonicalUrl,
      thumbnailUrl: media.thumbnailUrl,
      fileName: media.fileName,
      mimeType: media.mimeType,
      byteSize: media.byteSize,
    };
    if (privateAsset && privateAsset.group !== input.schoolId) {
      return { ok: false, error: createPlatformError("internal_error") };
    }
    return {
      ok: true,
      value: {
        id: media.publicId,
        url: asset.canonicalUrl,
        thumbnailUrl: asset.thumbnailUrl,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        byteSize: asset.byteSize,
      },
    };
  } catch {
    return { ok: false, error: createPlatformError("internal_error") };
  }
}

export async function listLearnerProducts(
  db: AppDb,
  input: { schoolId: string; publicSchoolId: string; learnerId: string },
  now: Date,
): Promise<LearnerProductDto[]> {
  const rows = await db
    .select({ product: schema.products, enrollment: schema.enrollments })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .innerJoin(schema.products, eq(schema.products.id, schema.enrollments.productId))
    .where(
      and(
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
        eq(schema.products.status, "published"),
      ),
    )
    .orderBy(asc(schema.products.title));
  const seen = new Set<string>();
  const distinctRows = rows.filter(({ product }) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });

  return Promise.all(
    distinctRows.map(async ({ product, enrollment }) => {
      const [publishedLessons, completedLessons, certificateRows, featuredMediaRows] =
        await Promise.all([
          db
            .select({ id: schema.lessons.id })
            .from(schema.lessons)
            .where(
              and(
                eq(schema.lessons.schoolId, input.schoolId),
                eq(schema.lessons.productId, product.id),
                eq(schema.lessons.status, "published"),
              ),
            ),
          db
            .select({ lessonId: schema.lessonProgress.lessonId })
            .from(schema.lessonProgress)
            .innerJoin(
              schema.lessons,
              eq(schema.lessons.id, schema.lessonProgress.lessonId),
            )
            .where(
              and(
                eq(schema.lessonProgress.schoolId, input.schoolId),
                eq(schema.lessonProgress.enrollmentId, enrollment.id),
                eq(schema.lessons.productId, product.id),
                eq(schema.lessons.status, "published"),
                isNotNull(schema.lessonProgress.completedAt),
              ),
            ),
          db
            .select({ publicId: schema.certificates.publicId })
            .from(schema.certificates)
            .where(
              and(
                eq(schema.certificates.schoolId, input.schoolId),
                eq(schema.certificates.learnerId, input.learnerId),
                eq(schema.certificates.productId, product.id),
                isNull(schema.certificates.revokedAt),
              ),
            )
            .limit(1),
          db
            .select({ media: schema.media })
            .from(schema.mediaReferences)
            .innerJoin(
              schema.media,
              eq(schema.media.id, schema.mediaReferences.mediaId),
            )
            .where(
              and(
                eq(schema.mediaReferences.schoolId, input.schoolId),
                eq(schema.mediaReferences.resourceType, "product_artwork"),
                eq(schema.mediaReferences.resourceInternalId, product.id),
                eq(schema.media.status, "active"),
              ),
            )
            .limit(1),
        ]);
      const media = featuredMediaRows[0]?.media;
      const featuredMedia: ProductFeaturedMediaDto | null = media
        ? {
            id: media.publicId,
            canonicalUrl: media.canonicalUrl,
            thumbnailUrl: media.thumbnailUrl,
            fileName: media.fileName,
            altText: media.altText,
          }
        : null;
      return {
        id: product.publicId,
        schoolId: input.publicSchoolId,
        kind: product.kind,
        status: product.status,
        slug: product.slug,
        title: product.title,
        description: product.description,
        featuredMedia,
        privacy: product.privacy,
        leadMagnet: product.leadMagnet,
        certificate: product.certificate,
        discussions: product.discussions,
        publishedAt: product.publishedAt ? serializeDate(product.publishedAt) : null,
        createdAt: serializeDate(product.createdAt),
        updatedAt: serializeDate(product.updatedAt),
        totalLessons: publishedLessons.length,
        completedLessonsCount: completedLessons.length,
        certificateId: certificateRows[0]?.publicId ?? null,
        downloaded: enrollment.downloaded,
      };
    }),
  );
}

export type LearnerSession = {
  learner: typeof schema.learners.$inferSelect;
  school: typeof schema.schools.$inferSelect;
  sessionId: string;
};

function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

class LearnerIdentityLinkError extends Error {
  constructor(readonly error: PlatformError) {
    super("learner_identity_link_failed");
  }
}

function throwIdentityLinkError(error: PlatformError): never {
  throw new LearnerIdentityLinkError(error);
}

function roleRank(role: "member" | "moderator" | "owner"): number {
  return role === "owner" ? 3 : role === "moderator" ? 2 : 1;
}

async function consumeLearnerIdentityLink(
  tx: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    learnerPublicId: string;
    token: string;
    now: Date;
    clock: Clock;
    requestId: string;
  },
): Promise<void> {
  const tokenRows = await tx
    .select()
    .from(schema.learnerIdentityLinkTokens)
    .where(
      and(
        eq(schema.learnerIdentityLinkTokens.schoolId, input.schoolId),
        eq(schema.learnerIdentityLinkTokens.tokenDigest, digestToken(input.token)),
        isNull(schema.learnerIdentityLinkTokens.consumedAt),
        gt(schema.learnerIdentityLinkTokens.expiresAt, input.now),
      ),
    )
    .limit(1);
  const linkToken = tokenRows[0];
  if (!linkToken) {
    throwIdentityLinkError(createPlatformError("unauthenticated"));
  }
  const adminUserId = linkToken.adminUserId;
  const claimedTokens = await tx
    .update(schema.learnerIdentityLinkTokens)
    .set({ consumedAt: input.now })
    .where(
      and(
        eq(schema.learnerIdentityLinkTokens.id, linkToken.id),
        isNull(schema.learnerIdentityLinkTokens.consumedAt),
      ),
    )
    .returning({ id: schema.learnerIdentityLinkTokens.id });
  if (claimedTokens.length === 0) {
    throwIdentityLinkError(createPlatformError("unauthenticated"));
  }

  const existingLearnerLink = await tx
    .select()
    .from(schema.learnerAdminLinks)
    .where(
      and(
        eq(schema.learnerAdminLinks.schoolId, input.schoolId),
        eq(schema.learnerAdminLinks.learnerId, input.learnerId),
      ),
    )
    .limit(1);
  if (existingLearnerLink[0] && existingLearnerLink[0].adminUserId !== adminUserId) {
    throwIdentityLinkError(
      createPlatformError("conflict", {
        safeDetails: { reason: "learner_already_linked" },
      }),
    );
  }
  const existingAdminLink = await tx
    .select()
    .from(schema.learnerAdminLinks)
    .where(
      and(
        eq(schema.learnerAdminLinks.schoolId, input.schoolId),
        eq(schema.learnerAdminLinks.adminUserId, adminUserId),
      ),
    )
    .limit(1);
  if (existingAdminLink[0] && existingAdminLink[0].learnerId !== input.learnerId) {
    throwIdentityLinkError(
      createPlatformError("conflict", {
        safeDetails: { reason: "admin_already_linked" },
      }),
    );
  }

  if (!existingLearnerLink[0]) {
    await tx.insert(schema.learnerAdminLinks).values({
      id: uuidv7(input.clock),
      schoolId: input.schoolId,
      learnerId: input.learnerId,
      adminUserId,
      createdAt: input.now,
    });
  }

  // A community created by an admin has an admin-owned owner membership. When
  // that admin explicitly claims a learner identity, merge that membership
  // into the learner identity instead of creating a second member row.
  const adminMemberships = await tx
    .select()
    .from(schema.communityMemberships)
    .where(
      and(
        eq(schema.communityMemberships.schoolId, input.schoolId),
        eq(schema.communityMemberships.adminUserId, adminUserId),
      ),
    );
  for (const adminMembership of adminMemberships) {
    if (adminMembership.learnerId === input.learnerId) continue;
    const learnerMemberships = await tx
      .select()
      .from(schema.communityMemberships)
      .where(
        and(
          eq(schema.communityMemberships.schoolId, input.schoolId),
          eq(schema.communityMemberships.communityId, adminMembership.communityId),
          eq(schema.communityMemberships.learnerId, input.learnerId),
        ),
      )
      .limit(1);
    const learnerMembership = learnerMemberships[0];
    if (learnerMembership && learnerMembership.id !== adminMembership.id) {
      if (
        learnerMembership.adminUserId &&
        learnerMembership.adminUserId !== adminUserId
      ) {
        throwIdentityLinkError(
          createPlatformError("conflict", {
            safeDetails: { reason: "community_identity_conflict" },
          }),
        );
      }
      await tx
        .update(schema.communityMemberships)
        .set({
          adminUserId,
          status:
            adminMembership.status === "active" ? "active" : learnerMembership.status,
          role:
            roleRank(adminMembership.role) > roleRank(learnerMembership.role)
              ? adminMembership.role
              : learnerMembership.role,
          rejectionReason:
            adminMembership.status === "active"
              ? null
              : learnerMembership.rejectionReason,
          updatedAt: input.now,
        })
        .where(eq(schema.communityMemberships.id, learnerMembership.id));
      await tx
        .delete(schema.communityMemberships)
        .where(eq(schema.communityMemberships.id, adminMembership.id));
    } else {
      await tx
        .update(schema.communityMemberships)
        .set({ learnerId: input.learnerId, updatedAt: input.now })
        .where(eq(schema.communityMemberships.id, adminMembership.id));
    }
  }

  await tx.insert(schema.auditEvents).values({
    id: uuidv7(input.clock),
    schoolId: input.schoolId,
    actorId: adminUserId,
    action: "learner.identity_linked",
    resourceType: "learner",
    resourceId: input.learnerPublicId,
    requestId: input.requestId,
    createdAt: input.now,
  });
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

function passwordMatches(password: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep <= 0) return false;
  const salt = stored.slice(0, sep);
  const expected = Buffer.from(stored.slice(sep + 1), "hex");
  const actual = scryptSync(password, salt, 32);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function adminLearnerToDto(
  learner: typeof schema.learners.$inferSelect,
  publicSchoolId: string,
): AdminLearnerDto {
  return {
    id: learner.publicId,
    schoolId: publicSchoolId,
    email: learner.email,
    name: learner.name,
    status: learner.status,
    createdAt: serializeDate(learner.createdAt),
  };
}

function encodeLearnerCursor(learner: typeof schema.learners.$inferSelect): string {
  return Buffer.from(
    JSON.stringify({ createdAt: learner.createdAt.toISOString(), id: learner.id }),
  ).toString("base64url");
}

function decodeLearnerCursor(value: string): { createdAt: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      return null;
    }
    const createdAt = new Date(parsed.createdAt);
    return Number.isNaN(createdAt.getTime()) ? null : { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

export function readLearnerSessionCookie(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const raw = headers.cookie ?? headers.Cookie;
  const header = Array.isArray(raw) ? raw.join("; ") : raw;
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    if (trimmed.slice(0, eqIndex) === LEARNER_SESSION_COOKIE) {
      const value = trimmed.slice(eqIndex + 1).trim();
      return value.length > 0 ? value : null;
    }
  }
  return null;
}


export function learnerSessionCookieHeader(token: string): string {
  return `${LEARNER_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`;
}

export function clearLearnerSessionCookieHeader(): string {
  return `${LEARNER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}


function toLearnerDto(
  learner: typeof schema.learners.$inferSelect,
  publicSchoolId: string,
): LearnerDto {
  return {
    id: learner.publicId,
    schoolId: publicSchoolId,
    email: learner.email,
    name: learner.name,
  };
}

export async function authenticateLearner(
  db: AppDb,
  headers: Record<string, string | string[] | undefined>,
  clock: Clock,
): Promise<
  | { kind: "absent" }
  | { kind: "authenticated"; value: LearnerSession }
  | { kind: "rejected"; error: PlatformError }
> {
  const token = readLearnerSessionCookie(headers);
  if (!token) return { kind: "absent" };
  const digest = digestToken(token);
  const now = clock.now();
  const rows = await db
    .select({
      session: schema.learnerSessions,
      learner: schema.learners,
      school: schema.schools,
    })
    .from(schema.learnerSessions)
    .innerJoin(
      schema.learners,
      eq(schema.learners.id, schema.learnerSessions.learnerId),
    )
    .innerJoin(schema.schools, eq(schema.schools.id, schema.learnerSessions.schoolId))
    .where(eq(schema.learnerSessions.tokenDigest, digest))
    .limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() <= now.getTime()) {
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  }
  if (row.learner.status !== "active") {
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  }
  return {
    kind: "authenticated",
    value: {
      learner: row.learner,
      school: row.school,
      sessionId: row.session.id,
    },
  };
}

export function assertLearnerSchool(
  session: LearnerSession,
  requestedPublicSchoolId: string | null,
): { ok: true } | { ok: false; error: PlatformError } {
  if (!requestedPublicSchoolId) return { ok: true };
  if (
    requestedPublicSchoolId !== session.school.publicId &&
    requestedPublicSchoolId !== session.school.subdomain
  ) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  return { ok: true };
}

async function issueSession(
  db: AppDb,
  learner: typeof schema.learners.$inferSelect,
  school: typeof schema.schools.$inferSelect,
  clock: Clock,
): Promise<{ token: string; dto: LearnerDto }> {
  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  await db.insert(schema.learnerSessions).values({
    id: uuidv7(clock),
    learnerId: learner.id,
    schoolId: school.id,
    tokenDigest: digestToken(token),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
  });
  return { token, dto: toLearnerDto(learner, school.publicId) };
}

function generateLearnerOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function learnerNameFromEmail(email: string): string {
  const localPart = email.split("@", 1)[0]?.trim();
  return (localPart || "Learner").slice(0, 200);
}

export async function requestLearnerOtp(
  db: AppDb,
  input: { email: string; schoolPublicId: string },
  clock: Clock,
  deliver: LearnerOtpDelivery,
): Promise<
  { ok: true; value: LearnerOtpRequestDto } | { ok: false; error: PlatformError }
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  const email = normalizeEmail(input.email);
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + LEARNER_OTP_TTL_MS);
  const otp = generateLearnerOtp();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.learnerOtpChallenges)
      .set({ consumedAt: now })
      .where(
        and(
          eq(schema.learnerOtpChallenges.schoolId, school.id),
          eq(schema.learnerOtpChallenges.email, email),
          isNull(schema.learnerOtpChallenges.consumedAt),
        ),
      );
    await tx.insert(schema.learnerOtpChallenges).values({
      id: uuidv7(clock),
      schoolId: school.id,
      email,
      codeDigest: hashPassword(otp),
      expiresAt,
      attempts: 0,
      createdAt: now,
    });
  });

  await deliver({
    schoolId: school.id,
    schoolPublicId: school.publicId,
    email,
    otp,
    expiresAt,
  });

  return { ok: true, value: { expiresAt: serializeDate(expiresAt) } };
}

export async function enqueueLearnerContactSync(
  db: AppDb,
  schoolId: string,
  learner: { email: string; name?: string | null },
  clock: Clock,
): Promise<void> {
  const now = clock.now();
  await db.insert(schema.integrationOutboxJobs).values({
    id: uuidv7(clock),
    schoolId,
    provider: "sendlit",
    type: "sync_sendlit_contact",
    payload: {
      email: learner.email,
      name: learner.name?.trim() || "",
      tags: ["learner"],
    },
    status: "pending",
    attempts: 0,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function verifyLearnerOtp(
  db: AppDb,
  input: {
    email: string;
    otp: string;
    name?: string;
    identityLinkToken?: string;
    schoolPublicId: string;
  },
  clock: Clock,
  requestId: string,
): Promise<
  { ok: true; value: LearnerDto; token: string } | { ok: false; error: PlatformError }
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  const email = normalizeEmail(input.email);
  const now = clock.now();

  try {
    return await db.transaction(async (tx) => {
      const challenges = await tx
        .select()
        .from(schema.learnerOtpChallenges)
        .where(
          and(
            eq(schema.learnerOtpChallenges.schoolId, school.id),
            eq(schema.learnerOtpChallenges.email, email),
            isNull(schema.learnerOtpChallenges.consumedAt),
            gt(schema.learnerOtpChallenges.expiresAt, now),
          ),
        )
        .orderBy(desc(schema.learnerOtpChallenges.createdAt))
        .limit(1);
      const challenge = challenges[0];
      if (!challenge) {
        return { ok: false as const, error: createPlatformError("unauthenticated") };
      }

      const nextAttempts = challenge.attempts + 1;
      if (!passwordMatches(input.otp, challenge.codeDigest)) {
        await tx
          .update(schema.learnerOtpChallenges)
          .set({
            attempts: nextAttempts,
            ...(nextAttempts >= LEARNER_OTP_MAX_ATTEMPTS ? { consumedAt: now } : {}),
          })
          .where(eq(schema.learnerOtpChallenges.id, challenge.id));
        return { ok: false as const, error: createPlatformError("unauthenticated") };
      }

      await tx
        .update(schema.learnerOtpChallenges)
        .set({ attempts: nextAttempts, consumedAt: now })
        .where(eq(schema.learnerOtpChallenges.id, challenge.id));

      const existing = await tx
        .select()
        .from(schema.learners)
        .where(
          and(
            eq(schema.learners.schoolId, school.id),
            eq(schema.learners.email, email),
          ),
        )
        .limit(1);
      let learner = existing[0];
      if (learner?.status !== "active" && learner) {
        return { ok: false as const, error: createPlatformError("unauthenticated") };
      }
      if (!learner) {
        learner = {
          id: uuidv7(clock),
          publicId: createPublicId("lrn", clock),
          schoolId: school.id,
          email,
          name: input.name?.trim() || learnerNameFromEmail(email),
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.learners).values(learner);
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(clock),
          schoolId: school.id,
          actorId: learner.publicId,
          action: "learner.signed_up",
          resourceType: "learner",
          resourceId: learner.publicId,
          requestId,
          createdAt: now,
        });
        await recordActivity(tx as unknown as AppDb, {
          schoolId: school.id,
          actorId: learner.publicId,
          type: ActivityType.USER_CREATED,
          entityId: learner.publicId,
          metadata: { email: learner.email },
        }, clock);
        await enqueueLearnerContactSync(tx as unknown as AppDb, school.id, learner, clock);
      }

      if (input.identityLinkToken) {
        await consumeLearnerIdentityLink(tx as unknown as AppDb, {
          schoolId: school.id,
          learnerId: learner.id,
          learnerPublicId: learner.publicId,
          token: input.identityLinkToken,
          now,
          clock,
          requestId,
        });
      }
      const issued = await issueSession(tx as unknown as AppDb, learner, school, clock);
      return { ok: true as const, value: issued.dto, token: issued.token };
    });
  } catch (error) {
    if (error instanceof LearnerIdentityLinkError) {
      return { ok: false, error: error.error };
    }
    throw error;
  }
}

export async function signUpLearner(
  db: AppDb,
  input: {
    email: string;
    password: string;
    name: string;
    identityLinkToken?: string;
    schoolPublicId: string;
  },
  clock: Clock,
  requestId: string,
): Promise<
  { ok: true; value: LearnerDto; token: string } | { ok: false; error: PlatformError }
> {
  if (input.password.length < 8) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  const email = normalizeEmail(input.email);
  const now = clock.now();
  try {
    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(schema.learners)
        .where(
          and(
            eq(schema.learners.schoolId, school.id),
            eq(schema.learners.email, email),
          ),
        )
        .limit(1);
      let learner = existing[0];
      let isNewLearner = false;
      if (learner) {
        const credential = await tx
          .select()
          .from(schema.learnerCredentials)
          .where(eq(schema.learnerCredentials.learnerId, learner.id))
          .limit(1);
        if (credential[0]) {
          return {
            ok: false as const,
            error: createPlatformError("conflict", {
              safeDetails: { reason: "email_taken" },
            }),
          };
        }
        await tx.insert(schema.learnerCredentials).values({
          learnerId: learner.id,
          passwordDigest: hashPassword(input.password),
          createdAt: now,
          updatedAt: now,
        });
        if (input.name && input.name !== learner.name) {
          await tx
            .update(schema.learners)
            .set({ name: input.name, updatedAt: now })
            .where(eq(schema.learners.id, learner.id));
          learner = { ...learner, name: input.name, updatedAt: now };
        }
      } else {
        isNewLearner = true;
        learner = {
          id: uuidv7(clock),
          publicId: createPublicId("lrn", clock),
          schoolId: school.id,
          email,
          name: input.name,
          status: "active",
          createdAt: now,
          updatedAt: now,
        };
        await tx.insert(schema.learners).values(learner);
        await tx.insert(schema.learnerCredentials).values({
          learnerId: learner.id,
          passwordDigest: hashPassword(input.password),
          createdAt: now,
          updatedAt: now,
        });
        await recordActivity(tx as unknown as AppDb, {
          schoolId: school.id,
          actorId: learner.publicId,
          type: ActivityType.USER_CREATED,
          entityId: learner.publicId,
          metadata: { email: learner.email },
        }, clock);
      }
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: school.id,
        actorId: learner.publicId,
        action: "learner.signed_up",
        resourceType: "learner",
        resourceId: learner.publicId,
        requestId,
        createdAt: now,
      });
      if (isNewLearner) {
        await enqueueLearnerContactSync(tx as unknown as AppDb, school.id, learner, clock);
      }
      if (input.identityLinkToken) {
        await consumeLearnerIdentityLink(tx as unknown as AppDb, {
          schoolId: school.id,
          learnerId: learner.id,
          learnerPublicId: learner.publicId,
          token: input.identityLinkToken,
          now,
          clock,
          requestId,
        });
      }
      const issued = await issueSession(tx as unknown as AppDb, learner, school, clock);
      return { ok: true as const, value: issued.dto, token: issued.token };
    });
  } catch (error) {
    if (error instanceof LearnerIdentityLinkError) {
      return { ok: false, error: error.error };
    }
    throw error;
  }
}

export async function signInLearner(
  db: AppDb,
  input: {
    email: string;
    password: string;
    identityLinkToken?: string;
    schoolPublicId: string;
  },
  clock: Clock,
  requestId: string,
): Promise<
  { ok: true; value: LearnerDto; token: string } | { ok: false; error: PlatformError }
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  const email = normalizeEmail(input.email);
  try {
    return await db.transaction(async (tx) => {
      const learners = await tx
        .select()
        .from(schema.learners)
        .where(
          and(
            eq(schema.learners.schoolId, school.id),
            eq(schema.learners.email, email),
          ),
        )
        .limit(1);
      const learner = learners[0];
      if (learner?.status !== "active") {
        return { ok: false as const, error: createPlatformError("unauthenticated") };
      }
      const credentials = await tx
        .select()
        .from(schema.learnerCredentials)
        .where(eq(schema.learnerCredentials.learnerId, learner.id))
        .limit(1);
      const credential = credentials[0];
      if (!credential || !passwordMatches(input.password, credential.passwordDigest)) {
        return { ok: false as const, error: createPlatformError("unauthenticated") };
      }
      if (input.identityLinkToken) {
        await consumeLearnerIdentityLink(tx as unknown as AppDb, {
          schoolId: school.id,
          learnerId: learner.id,
          learnerPublicId: learner.publicId,
          token: input.identityLinkToken,
          now: clock.now(),
          clock,
          requestId,
        });
      }
      const issued = await issueSession(tx as unknown as AppDb, learner, school, clock);
      return { ok: true as const, value: issued.dto, token: issued.token };
    });
  } catch (error) {
    if (error instanceof LearnerIdentityLinkError) {
      return { ok: false, error: error.error };
    }
    throw error;
  }
}

export async function signOutLearner(
  db: AppDb,
  session: LearnerSession,
): Promise<void> {
  await db
    .delete(schema.learnerSessions)
    .where(eq(schema.learnerSessions.id, session.sessionId));
}

async function loadPublishedProductInSchool(
  db: AppDb,
  schoolId: string,
  productPublicId: string,
) {
  const rows = await db
    .select()
    .from(schema.products)
    .where(
      and(
        eq(schema.products.publicId, productPublicId),
        eq(schema.products.schoolId, schoolId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function ensureLearnerProductAccess(
  db: AppDb,
  input: {
    schoolId: string;
    publicSchoolId: string;
    learnerId: string;
    actorId: string;
    product: typeof schema.products.$inferSelect;
    source: EnrollmentDto["source"];
    requestId: string;
  },
  clock: Clock,
): Promise<EnrollmentDto> {
  const now = clock.now();
  const existing = await db
    .select()
    .from(schema.enrollments)
    .where(
      and(
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, input.product.id),
      ),
    )
    .limit(1);
  const enrollment = existing[0];
  if (enrollment) {
    const grants = await db
      .select()
      .from(schema.enrollmentAccessGrants)
      .where(eq(schema.enrollmentAccessGrants.enrollmentId, enrollment.id))
      .limit(1);
    const grant = grants[0];
    if (enrollment.status !== "active") {
      await db
        .update(schema.enrollments)
        .set({ status: "active" })
        .where(eq(schema.enrollments.id, enrollment.id));
    }
    if (grant && grant.status !== "active") {
      await db
        .update(schema.enrollmentAccessGrants)
        .set({ status: "active", startsAt: now, endsAt: null })
        .where(eq(schema.enrollmentAccessGrants.id, grant.id));
    } else if (!grant) {
      await db.insert(schema.enrollmentAccessGrants).values({
        id: uuidv7(clock),
        publicId: createPublicId("eag", clock),
        schoolId: input.schoolId,
        enrollmentId: enrollment.id,
        source: input.source,
        status: "active",
        startsAt: now,
        endsAt: null,
        createdAt: now,
      });
    }
    return {
      id: enrollment.publicId,
      schoolId: input.publicSchoolId,
      productId: input.product.publicId,
      source: enrollment.source,
      status: "active",
    };
  }
  const row = {
    id: uuidv7(clock),
    publicId: createPublicId("enr", clock),
    schoolId: input.schoolId,
    learnerId: input.learnerId,
    productId: input.product.id,
    source: input.source,
    status: "active" as const,
    createdAt: now,
  };
  await db.insert(schema.enrollments).values(row);
  await db.insert(schema.enrollmentAccessGrants).values({
    id: uuidv7(clock),
    publicId: createPublicId("eag", clock),
    schoolId: input.schoolId,
    enrollmentId: row.id,
    source: input.source,
    status: "active",
    startsAt: now,
    endsAt: null,
    createdAt: now,
  });
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    actorId: input.actorId,
    action: "enrollment.created",
    resourceType: "enrollment",
    resourceId: row.publicId,
    requestId: input.requestId,
    createdAt: now,
  });
  await recordActivity(db, {
    schoolId: input.schoolId,
    actorId: input.learnerId,
    type: ActivityType.ENROLLED,
    entityId: input.product.publicId,
    metadata: { source: input.source, enrollmentId: row.publicId },
  }, clock);
  return {
    id: row.publicId,
    schoolId: input.publicSchoolId,
    productId: input.product.publicId,
    source: row.source,
    status: row.status,
  };
}

export async function enrollLearner(
  db: AppDb,
  input: {
    schoolId: string;
    publicSchoolId: string;
    learnerId: string;
    actorId: string;
    productPublicId: string;
    source: "free_signup" | "admin_grant";
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: EnrollmentDto } | { ok: false; error: PlatformError }> {
  const product = await loadPublishedProductInSchool(
    db,
    input.schoolId,
    input.productPublicId,
  );
  if (product?.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  return db.transaction(async (tx) => {
    const value = await ensureLearnerProductAccess(
      tx as unknown as AppDb,
      {
        ...input,
        product,
      },
      clock,
    );
    return {
      ok: true as const,
      value,
    };
  });
}

export async function grantEnrollment(
  db: AppDb,
  input: {
    schoolId: string;
    publicSchoolId: string;
    actorId: string;
    productPublicId: string;
    email: string;
    name: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: EnrollmentDto } | { ok: false; error: PlatformError }> {
  const email = normalizeEmail(input.email);
  const now = clock.now();
  const learner = await db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.learners)
      .where(
        and(
          eq(schema.learners.schoolId, input.schoolId),
          eq(schema.learners.email, email),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const created = {
      id: uuidv7(clock),
      publicId: createPublicId("lrn", clock),
      schoolId: input.schoolId,
      email,
      name: input.name,
      status: "active" as const,
      createdAt: now,
      updatedAt: now,
    };
    await tx.insert(schema.learners).values(created);
    await recordActivity(tx as unknown as AppDb, {
      schoolId: input.schoolId,
      actorId: created.publicId,
      type: ActivityType.USER_CREATED,
      entityId: created.publicId,
      metadata: { email: created.email, source: "admin_grant" },
    }, clock);
    await enqueueLearnerContactSync(tx as unknown as AppDb, input.schoolId, created, clock);
    return created;
  });
  return enrollLearner(
    db,
    {
      schoolId: input.schoolId,
      publicSchoolId: input.publicSchoolId,
      learnerId: learner.id,
      actorId: input.actorId,
      productPublicId: input.productPublicId,
      source: "admin_grant",
      requestId: input.requestId,
    },
    clock,
  );
}

export async function completeLesson(
  db: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    actorId: string;
    lessonPublicId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: ProgressDto } | { ok: false; error: PlatformError }> {
  const lessons = await db
    .select({
      lesson: schema.lessons,
      product: schema.products,
    })
    .from(schema.lessons)
    .innerJoin(schema.products, eq(schema.products.id, schema.lessons.productId))
    .where(
      and(
        eq(schema.lessons.publicId, input.lessonPublicId),
        eq(schema.lessons.schoolId, input.schoolId),
      ),
    )
    .limit(1);
  const row = lessons[0];
  if (row?.lesson.status !== "published" || row.product.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const now = clock.now();
  const enrollments = await db
    .select({
      enrollment: schema.enrollments,
      grant: schema.enrollmentAccessGrants,
    })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, row.product.id),
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
      ),
    )
    .limit(1);
  const enrollment = enrollments[0]?.enrollment;
  if (!enrollment) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const grant = enrollments[0]?.grant;
  const enrollmentStartedAt = grant
    ? enrollment.createdAt > grant.startsAt
      ? enrollment.createdAt
      : grant.startsAt
    : enrollment.createdAt;
  const sectionAccess = await sectionAccessForLesson(
    db,
    row.lesson,
    enrollmentStartedAt,
  );
  const availableAt = latestUnlockAt(
    lessonUnlockAt(row.lesson, enrollmentStartedAt),
    sectionAccess.availableAt,
  );
  if (
    (sectionAccess.required &&
      (!sectionAccess.availableAt || sectionAccess.availableAt > now)) ||
    (availableAt && availableAt > now)
  ) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: {
          reason: "lesson_locked",
          availableAt: availableAt ? serializeDate(availableAt) : null,
        },
      }),
    };
  }
  if (row.lesson.type === "quiz") {
    const passedEvaluations = await db
      .select({ id: schema.lessonEvaluations.id })
      .from(schema.lessonEvaluations)
      .where(
        and(
          eq(schema.lessonEvaluations.schoolId, input.schoolId),
          eq(schema.lessonEvaluations.enrollmentId, enrollment.id),
          eq(schema.lessonEvaluations.lessonId, row.lesson.id),
          eq(schema.lessonEvaluations.pass, true),
        ),
      )
      .limit(1);
    if (!passedEvaluations[0]) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "need_to_pass" },
        }),
      };
    }
  }
  if (row.lesson.type === "scorm") {
    const runtimeRows = await db
      .select({ state: schema.scormRuntimeStates.state })
      .from(schema.scormRuntimeStates)
      .where(
        and(
          eq(schema.scormRuntimeStates.schoolId, input.schoolId),
          eq(schema.scormRuntimeStates.enrollmentId, enrollment.id),
          eq(schema.scormRuntimeStates.lessonId, row.lesson.id),
        ),
      )
      .limit(1);
    const runtime = runtimeRows[0]?.state;
    const cmi =
      runtime && typeof runtime.cmi === "object" && runtime.cmi !== null
        ? (runtime.cmi as Record<string, unknown>)
        : null;
    const core =
      cmi?.core && typeof cmi.core === "object" && cmi.core !== null
        ? (cmi.core as Record<string, unknown>)
        : null;
    const status12 = core?.lesson_status;
    const completion2004 = cmi?.completion_status;
    const success2004 = cmi?.success_status;
    const hasCompletionStatus =
      status12 === "completed" ||
      status12 === "passed" ||
      completion2004 === "completed" ||
      success2004 === "passed";
    const hasInteractionData = Boolean(
      cmi?.suspend_data || core?.session_time || core?.exit,
    );
    if (!hasCompletionStatus && !hasInteractionData) {
      return {
        ok: false,
        error: createPlatformError("validation_failed", {
          safeDetails: { reason: "scorm_content_incomplete" },
        }),
      };
    }
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.lessonProgress)
      .where(
        and(
          eq(schema.lessonProgress.enrollmentId, enrollment.id),
          eq(schema.lessonProgress.lessonId, row.lesson.id),
        ),
      )
      .limit(1);
    if (existing[0]) {
      if (!existing[0].completedAt) {
        await tx
          .update(schema.lessonProgress)
          .set({ completedAt: now })
          .where(eq(schema.lessonProgress.id, existing[0].id));
        await tx.insert(schema.auditEvents).values({
          id: uuidv7(clock),
          schoolId: input.schoolId,
          actorId: input.actorId,
          action: "lesson.completed",
          resourceType: "lesson",
          resourceId: row.lesson.publicId,
          requestId: input.requestId,
          createdAt: now,
        });
        await recordActivity(tx as unknown as AppDb, {
          schoolId: input.schoolId,
          actorId: input.learnerId,
          type: ActivityType.LESSON_COMPLETED,
          entityId: row.lesson.publicId,
          metadata: { productId: row.product.publicId },
        }, clock);
      }
      const completion = await issueCertificateIfComplete(
        tx as unknown as AppDb,
        {
          schoolId: input.schoolId,
          productId: row.product.id,
          learnerId: input.learnerId,
          enrollmentId: enrollment.id,
          actorId: input.actorId,
          requestId: input.requestId,
        },
        clock,
      );
      if (completion.courseCompleted) {
        await recordActivity(tx as unknown as AppDb, {
          schoolId: input.schoolId,
          actorId: input.learnerId,
          type: ActivityType.COURSE_COMPLETED,
          entityId: row.product.publicId,
        }, clock);
      }
      const completedAt = existing[0].completedAt ?? now;
      return {
        ok: true as const,
        value: {
          lessonId: row.lesson.publicId,
          enrollmentId: enrollment.publicId,
          startedAt: serializeDate(existing[0].startedAt),
          completedAt: serializeDate(completedAt),
          ...completion,
        },
      };
    }
    await tx.insert(schema.lessonProgress).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      enrollmentId: enrollment.id,
      lessonId: row.lesson.id,
      startedAt: now,
      completedAt: now,
      createdAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "lesson.completed",
      resourceType: "lesson",
      resourceId: row.lesson.publicId,
      requestId: input.requestId,
      createdAt: now,
    });
    await recordActivity(tx as unknown as AppDb, {
      schoolId: input.schoolId,
      actorId: input.learnerId,
      type: ActivityType.LESSON_COMPLETED,
      entityId: row.lesson.publicId,
      metadata: { productId: row.product.publicId },
    }, clock);
    const completion = await issueCertificateIfComplete(
      tx as unknown as AppDb,
      {
        schoolId: input.schoolId,
        productId: row.product.id,
        learnerId: input.learnerId,
        enrollmentId: enrollment.id,
        actorId: input.actorId,
        requestId: input.requestId,
      },
      clock,
    );
    if (completion.courseCompleted) {
      await recordActivity(tx as unknown as AppDb, {
        schoolId: input.schoolId,
        actorId: input.learnerId,
        type: ActivityType.COURSE_COMPLETED,
        entityId: row.product.publicId,
      }, clock);
    }
    return {
      ok: true as const,
      value: {
        lessonId: row.lesson.publicId,
        enrollmentId: enrollment.publicId,
        startedAt: serializeDate(now),
        completedAt: serializeDate(now),
        ...completion,
      },
    };
  });
}

export async function startLesson(
  db: AppDb,
  input: {
    schoolId: string;
    learnerId: string;
    actorId: string;
    lessonPublicId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<
  { ok: true; value: LessonProgressDto } | { ok: false; error: PlatformError }
> {
  const lessons = await db
    .select({ lesson: schema.lessons, product: schema.products })
    .from(schema.lessons)
    .innerJoin(schema.products, eq(schema.products.id, schema.lessons.productId))
    .where(
      and(
        eq(schema.lessons.publicId, input.lessonPublicId),
        eq(schema.lessons.schoolId, input.schoolId),
      ),
    )
    .limit(1);
  const row = lessons[0];
  if (row?.lesson.status !== "published" || row.product.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  const now = clock.now();
  const enrollments = await db
    .select({ enrollment: schema.enrollments, grant: schema.enrollmentAccessGrants })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, row.product.id),
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
        lte(schema.enrollmentAccessGrants.startsAt, now),
        or(
          isNull(schema.enrollmentAccessGrants.endsAt),
          gt(schema.enrollmentAccessGrants.endsAt, now),
        ),
      ),
    )
    .limit(1);
  const enrollment = enrollments[0]?.enrollment;
  const grant = enrollments[0]?.grant;
  if (!enrollment || !grant) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const enrollmentStartedAt =
    enrollment.createdAt > grant.startsAt ? enrollment.createdAt : grant.startsAt;
  const sectionAccess = await sectionAccessForLesson(
    db,
    row.lesson,
    enrollmentStartedAt,
  );
  const availableAt = latestUnlockAt(
    lessonUnlockAt(row.lesson, enrollmentStartedAt),
    sectionAccess.availableAt,
  );
  if (
    (sectionAccess.required &&
      (!sectionAccess.availableAt || sectionAccess.availableAt > now)) ||
    (availableAt && availableAt > now)
  ) {
    return {
      ok: false,
      error: createPlatformError("forbidden", {
        safeDetails: {
          reason: "lesson_locked",
          availableAt: availableAt ? serializeDate(availableAt) : null,
        },
      }),
    };
  }
  return db.transaction(async (tx) => {
    const existing = await tx
      .select()
      .from(schema.lessonProgress)
      .where(
        and(
          eq(schema.lessonProgress.enrollmentId, enrollment.id),
          eq(schema.lessonProgress.lessonId, row.lesson.id),
        ),
      )
      .limit(1);
    if (existing[0]) {
      return {
        ok: true as const,
        value: {
          lessonId: row.lesson.publicId,
          enrollmentId: enrollment.publicId,
          startedAt: serializeDate(existing[0].startedAt),
          completedAt: existing[0].completedAt
            ? serializeDate(existing[0].completedAt)
            : null,
        },
      };
    }
    await tx.insert(schema.lessonProgress).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      enrollmentId: enrollment.id,
      lessonId: row.lesson.id,
      startedAt: now,
      completedAt: null,
      createdAt: now,
    });
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      actorId: input.actorId,
      action: "lesson.started",
      resourceType: "lesson",
      resourceId: row.lesson.publicId,
      requestId: input.requestId,
      createdAt: now,
    });
    await recordActivity(tx as unknown as AppDb, {
      schoolId: input.schoolId,
      actorId: input.learnerId,
      type: ActivityType.LESSON_STARTED,
      entityId: row.lesson.publicId,
      metadata: { productId: row.product.publicId },
    }, clock);
    return {
      ok: true as const,
      value: {
        lessonId: row.lesson.publicId,
        enrollmentId: enrollment.publicId,
        startedAt: serializeDate(now),
        completedAt: null,
      },
    };
  });
}

export async function listLearnerProgress(
  db: AppDb,
  input: { schoolId: string; learnerId: string; productPublicId: string },
): Promise<
  { ok: true; value: LessonProgressDto[] } | { ok: false; error: PlatformError }
> {
  const products = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(
      and(
        eq(schema.products.publicId, input.productPublicId),
        eq(schema.products.schoolId, input.schoolId),
      ),
    )
    .limit(1);
  const product = products[0];
  if (!product) return { ok: false, error: createPlatformError("not_found") };
  const enrollments = await db
    .select({ id: schema.enrollments.id, publicId: schema.enrollments.publicId })
    .from(schema.enrollments)
    .innerJoin(
      schema.enrollmentAccessGrants,
      eq(schema.enrollmentAccessGrants.enrollmentId, schema.enrollments.id),
    )
    .where(
      and(
        eq(schema.enrollments.learnerId, input.learnerId),
        eq(schema.enrollments.productId, product.id),
        eq(schema.enrollments.schoolId, input.schoolId),
        eq(schema.enrollments.status, "active"),
        eq(schema.enrollmentAccessGrants.schoolId, input.schoolId),
        eq(schema.enrollmentAccessGrants.status, "active"),
      ),
    )
    .limit(1);
  const enrollment = enrollments[0];
  if (!enrollment) return { ok: true, value: [] };
  const rows = await db
    .select({
      progress: schema.lessonProgress,
      lessonPublicId: schema.lessons.publicId,
    })
    .from(schema.lessonProgress)
    .innerJoin(schema.lessons, eq(schema.lessons.id, schema.lessonProgress.lessonId))
    .where(
      and(
        eq(schema.lessonProgress.schoolId, input.schoolId),
        eq(schema.lessonProgress.enrollmentId, enrollment.id),
      ),
    )
    .orderBy(asc(schema.lessonProgress.startedAt));
  return {
    ok: true,
    value: rows.map(({ progress, lessonPublicId }) => ({
      lessonId: lessonPublicId,
      enrollmentId: enrollment.publicId,
      startedAt: serializeDate(progress.startedAt),
      completedAt: progress.completedAt ? serializeDate(progress.completedAt) : null,
    })),
  };
}

type AdminLearnerContext = {
  schoolId: string | null;
  publicSchoolId: string;
  principalId: string;
  requestId: string;
  permissions: ReadonlySet<CourseLitPermission>;
};

export async function createLearnerIdentityLink(
  db: AppDb,
  ctx: AdminLearnerContext,
  clock: Clock,
): Promise<
  { ok: true; value: LearnerIdentityLinkDto } | { ok: false; error: PlatformError }
> {
  if (!canWriteLearners(ctx)) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  const expiresAt = new Date(now.getTime() + LEARNER_IDENTITY_LINK_TTL_MS);
  await db.insert(schema.learnerIdentityLinkTokens).values({
    id: uuidv7(clock),
    schoolId: ctx.schoolId!,
    adminUserId: ctx.principalId,
    tokenDigest: digestToken(token),
    expiresAt,
    consumedAt: null,
    createdAt: now,
  });
  return {
    ok: true,
    value: { token, expiresAt: serializeDate(expiresAt) },
  };
}

function canReadLearners(ctx: AdminLearnerContext): boolean {
  return Boolean(
    ctx.schoolId &&
      (ctx.permissions.has("learners:read") || ctx.permissions.has("school:admin")),
  );
}

function canWriteLearners(ctx: AdminLearnerContext): boolean {
  return Boolean(
    ctx.schoolId &&
      (ctx.permissions.has("learners:write") || ctx.permissions.has("school:admin")),
  );
}

export async function listLearners(
  db: AppDb,
  ctx: AdminLearnerContext,
  input: { cursor?: string; limit: number },
): Promise<
  | { ok: true; value: { items: AdminLearnerDto[]; nextCursor: string | null } }
  | { ok: false; error: PlatformError }
> {
  if (!canReadLearners(ctx)) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const cursor = input.cursor ? decodeLearnerCursor(input.cursor) : null;
  if (input.cursor && !cursor) {
    return {
      ok: false,
      error: createPlatformError("validation_failed", {
        safeDetails: { reason: "invalid_cursor" },
      }),
    };
  }
  const rows = await db
    .select()
    .from(schema.learners)
    .where(
      and(
        eq(schema.learners.schoolId, ctx.schoolId!),
        cursor
          ? or(
              gt(schema.learners.createdAt, cursor.createdAt),
              and(
                eq(schema.learners.createdAt, cursor.createdAt),
                gt(schema.learners.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(schema.learners.createdAt), asc(schema.learners.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    ok: true,
    value: {
      items: page.map((learner) => adminLearnerToDto(learner, ctx.publicSchoolId)),
      nextCursor: hasMore ? encodeLearnerCursor(page[page.length - 1]!) : null,
    },
  };
}

export async function updateLearnerStatus(
  db: AppDb,
  ctx: AdminLearnerContext,
  learnerPublicId: string,
  status: "active" | "deactivated",
  clock: Clock,
): Promise<{ ok: true; value: AdminLearnerDto } | { ok: false; error: PlatformError }> {
  if (!canWriteLearners(ctx)) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const now = clock.now();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(schema.learners)
      .where(
        and(
          eq(schema.learners.publicId, learnerPublicId),
          eq(schema.learners.schoolId, ctx.schoolId!),
        ),
      )
      .limit(1);
    const learner = rows[0];
    if (!learner) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    if (learner.status !== status) {
      await tx
        .update(schema.learners)
        .set({ status, updatedAt: now })
        .where(eq(schema.learners.id, learner.id));
      if (status === "deactivated") {
        await tx
          .delete(schema.learnerSessions)
          .where(eq(schema.learnerSessions.learnerId, learner.id));
      }
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.schoolId!,
        actorId: ctx.principalId,
        action: status === "active" ? "learner.restored" : "learner.deactivated",
        resourceType: "learner",
        resourceId: learner.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    }
    return {
      ok: true as const,
      value: adminLearnerToDto(
        { ...learner, status, updatedAt: now },
        ctx.publicSchoolId,
      ),
    };
  });
}

export function learnerMe(session: LearnerSession): LearnerDto {
  return toLearnerDto(session.learner, session.school.publicId);
}
