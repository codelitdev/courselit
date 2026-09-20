import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  createPublicId,
  type PlatformError,
  serializeDate,
  uuidv7,
} from "@codelitdev/platform";
import { and, asc, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import { lessonUnlockAt, sectionUnlockAt } from "./catalog.js";
import { issueCertificateIfComplete } from "./certificates.js";
import * as schema from "./db/schema/index.js";
import { normalizeEmail } from "./invitations.js";
import { upsertLearnerMembership } from "./learner-memberships.js";
import {
  type LearnerProfileFields,
  readLearnerProfile,
  updateLearnerProfileContact,
} from "./learner-profile.js";
import type { MediaLitClient } from "./media.js";
import type { CourseLitPermission } from "./permissions.js";
import { type ProductDto, productFeaturedImageFor } from "./products.js";
import { loadSchoolByPublicId } from "./schools.js";
import type { AppDb } from "./types.js";

export const LEARNER_SESSION_COOKIE = "courselit.learner.session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LEARNER_IDENTITY_LINK_TTL_MS = 10 * 60 * 1000;

export type LearnerDto = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  avatarMediaId: string | null;
  image: string | null;
  bio: string;
  emailUpdatesEnabled: boolean;
};

export type AdminLearnerDto = {
  id: string;
  schoolId: string;
  email: string;
  name: string;
  status: "active" | "deactivated";
  createdAt: string;
};

export type LearnerMembershipDto = {
  id: string;
  schoolId: string;
  entityType: "product" | "community";
  entityId: string;
  paymentPlanId: string | null;
  status:
    | "active"
    | "payment_failed"
    | "expired"
    | "pending"
    | "rejected"
    | "paused";
  role: "comment" | "post" | "moderate" | null;
  subscriptionId: string | null;
  subscriptionMethod: string | null;
  joiningReason: string;
  rejectionReason: string | null;
  isIncludedInPlan: boolean;
};

export type ProgressDto = {
  lessonId: string;
  membershipId: string;
  startedAt: string;
  completedAt: string;
  courseCompleted: boolean;
  certificateId: string | null;
};

export type LessonProgressDto = {
  lessonId: string;
  membershipId: string;
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

export type LearnerIdentityLinkDto = {
  token: string;
  expiresAt: string;
};

export type LearnerSession = {
  schoolAccount: typeof schema.schoolAccounts.$inferSelect;
  learner: typeof schema.schoolAccounts.$inferSelect & { name: string };
  school: typeof schema.schools.$inferSelect;
  sessionId: string;
  userId: string;
  authenticationMethod: "email" | "google";
};

export function digestToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function latestUnlockAt(...dates: (Date | null)[]): Date | null {
  return dates.reduce<Date | null>((latest, date) => {
    if (!date) return latest;
    return !latest || date > latest ? date : latest;
  }, null);
}

async function sectionAccessForLesson(
  db: AppDb,
  lesson: typeof schema.lessons.$inferSelect,
  accessStartedAt: Date,
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
    availableAt: sectionUnlockAt(sections, section.id, accessStartedAt),
  };
}

async function activeProductMembershipForLesson(
  db: AppDb,
  input: { schoolId: string; schoolAccountId: string; productPublicId: string },
) {
  const rows = await db
    .select({ membership: schema.learnerMemberships })
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, input.schoolAccountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, input.productPublicId),
        eq(schema.learnerMemberships.status, "active"),
      ),
    )
    .limit(1);
  return rows[0]?.membership ?? null;
}

type LessonMediaViewer =
  | { kind: "public" }
  | { kind: "preview" }
  | { kind: "learner"; schoolAccountId?: string; learnerId?: string };

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
  let membershipStartedAt: Date | null = null;
  if (input.viewer.kind === "learner") {
    const accountId = input.viewer.schoolAccountId ?? input.viewer.learnerId!;
    const membership = await activeProductMembershipForLesson(db, {
      schoolId: input.schoolId,
      schoolAccountId: accountId,
      productPublicId: row.product.publicId,
    });
    enrolled = Boolean(membership);
    membershipStartedAt = membership?.createdAt ?? null;
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
    section && membershipStartedAt
      ? sectionUnlockAt(sections, section.id, membershipStartedAt)
      : null;
  const availableAt = latestUnlockAt(
    preview || !membershipStartedAt
      ? row.lesson.dripAt
      : lessonUnlockAt(row.lesson, membershipStartedAt),
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
  input: {
    schoolId: string;
    publicSchoolId: string;
    schoolAccountId?: string;
    learnerId?: string;
  },
): Promise<LearnerProductDto[]> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const rows = await db
    .select({ product: schema.products, membership: schema.learnerMemberships })
    .from(schema.learnerMemberships)
    .innerJoin(
      schema.products,
      eq(schema.products.publicId, schema.learnerMemberships.entityId),
    )
    .where(
      and(
        eq(schema.learnerMemberships.schoolId, input.schoolId),
        eq(schema.learnerMemberships.schoolAccountId, accountId),
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.status, "active"),
        eq(schema.products.schoolId, input.schoolId),
        eq(schema.products.status, "published"),
      ),
    )
    .orderBy(asc(schema.products.title));
  const distinctRows = [...new Map(rows.map((row) => [row.product.id, row])).values()];
  const membershipsByProduct = new Map<string, typeof rows[number]["membership"][]>();
  for (const row of rows) {
    const memberships = membershipsByProduct.get(row.product.id) ?? [];
    memberships.push(row.membership);
    membershipsByProduct.set(row.product.id, memberships);
  }

  return Promise.all(
    distinctRows.map(async ({ product }) => {
      const memberships = membershipsByProduct.get(product.id) ?? [];
      const membershipIds = memberships.map((membership) => membership.id);
      const [publishedLessons, completedLessons, certificateRows, featuredImage, downloadRows] =
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
                inArray(schema.lessonProgress.membershipId, membershipIds),
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
                eq(schema.certificates.schoolAccountId, accountId),
                eq(schema.certificates.productId, product.id),
                isNull(schema.certificates.revokedAt),
              ),
            )
            .limit(1),
          productFeaturedImageFor(db, product),
          db
            .select({ id: schema.downloadLinks.id })
            .from(schema.downloadLinks)
            .where(
              and(
                eq(schema.downloadLinks.schoolId, input.schoolId),
                inArray(schema.downloadLinks.membershipId, membershipIds),
                eq(schema.downloadLinks.consumed, true),
              ),
            )
            .limit(1),
        ]);
      return {
        id: product.publicId,
        schoolId: input.publicSchoolId,
        kind: product.kind,
        status: product.status,
        slug: product.slug,
        title: product.title,
        description: product.description,
        featuredImage,
        privacy: product.privacy,
        leadMagnet: product.leadMagnet,
        certificate: product.certificate,
        discussions: product.discussions,
        includedWithCommunity: product.includedWithCommunity,
        discussionSpaceId: product.discussionSpaceId,
        publishedAt: product.publishedAt ? serializeDate(product.publishedAt) : null,
        createdAt: serializeDate(product.createdAt),
        updatedAt: serializeDate(product.updatedAt),
        totalLessons: publishedLessons.length,
        completedLessonsCount: completedLessons.length,
        certificateId: certificateRows[0]?.publicId ?? null,
        downloaded: downloadRows.length > 0,
      };
    }),
  );
}

function adminLearnerToDto(
  account: typeof schema.schoolAccounts.$inferSelect,
  publicSchoolId: string,
): AdminLearnerDto {
  return {
    id: account.publicId,
    schoolId: publicSchoolId,
    email: account.email,
    name: account.displayName,
    status: account.status,
    createdAt: serializeDate(account.createdAt),
  };
}

function encodeLearnerCursor(account: typeof schema.schoolAccounts.$inferSelect): string {
  return Buffer.from(
    JSON.stringify({ createdAt: account.createdAt.toISOString(), id: account.id }),
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

export function toLearnerDto(
  account: typeof schema.schoolAccounts.$inferSelect,
  publicSchoolId: string,
  profile: LearnerProfileFields = {
    avatarMediaId: null,
    image: null,
    bio: "",
    emailUpdatesEnabled: true,
  },
): LearnerDto {
  return {
    id: account.publicId,
    schoolId: publicSchoolId,
    email: account.email,
    name: account.displayName,
    avatarMediaId: profile.avatarMediaId,
    image: profile.image,
    bio: profile.bio,
    emailUpdatesEnabled: profile.emailUpdatesEnabled,
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
      session: schema.schoolSessions,
      account: schema.schoolAccounts,
      school: schema.schools,
    })
    .from(schema.schoolSessions)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.schoolSessions.schoolAccountId),
    )
    .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolSessions.schoolId))
    .where(eq(schema.schoolSessions.tokenDigest, digest))
    .limit(1);
  const row = rows[0];
  if (!row || row.session.expiresAt.getTime() <= now.getTime()) {
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  }
  if (row.account.status !== "active") {
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  }
  const hasGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const allowedMethods = hasGoogle ? ["email", "google"] : ["email"];
  if (!allowedMethods.includes(row.session.authenticationMethod)) {
    return { kind: "rejected", error: createPlatformError("unauthenticated") };
  }
  return {
    kind: "authenticated",
    value: {
      schoolAccount: row.account,
      learner: Object.assign({}, row.account, { name: row.account.displayName }),
      school: row.school,
      sessionId: row.session.id,
      userId: row.session.userId,
      authenticationMethod: row.session.authenticationMethod,
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

export async function ensureSchoolAccount(
  db: AppDb,
  input: {
    schoolId: string;
    userId: string;
    email: string;
    displayName?: string | null;
    image?: string | null;
    clock: Clock;
  },
): Promise<typeof schema.schoolAccounts.$inferSelect> {
  const email = normalizeEmail(input.email);
  const existing = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, input.schoolId),
        eq(schema.schoolAccounts.userId, input.userId),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return existing[0];
  }
  const byEmail = await db
    .select()
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, input.schoolId),
        eq(schema.schoolAccounts.email, email),
      ),
    )
    .limit(1);
  const now = input.clock.now();
  if (byEmail[0]) {
    const updated = await db
      .update(schema.schoolAccounts)
      .set({
        userId: input.userId,
        displayName: input.displayName?.trim() || byEmail[0].displayName,
        image: input.image ?? byEmail[0].image,
        updatedAt: now,
      })
      .where(eq(schema.schoolAccounts.id, byEmail[0].id))
      .returning();
    return updated[0];
  }
  const publicId = createPublicId("lrn", input.clock);
  const name = input.displayName?.trim() || learnerNameFromEmail(email);
  const inserted = await db
    .insert(schema.schoolAccounts)
    .values({
      id: uuidv7(input.clock),
      publicId,
      schoolId: input.schoolId,
      userId: input.userId,
      email,
      displayName: name,
      image: input.image ?? null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return inserted[0];
}

export async function issueSchoolSession(
  db: AppDb,
  input: {
    school: typeof schema.schools.$inferSelect;
    schoolAccount: typeof schema.schoolAccounts.$inferSelect;
    userId: string;
    authenticationMethod: "email" | "google";
    clock: Clock;
  },
): Promise<{ token: string; dto: LearnerDto; session: LearnerSession }> {
  const token = randomBytes(32).toString("base64url");
  const sessionId = uuidv7(input.clock);
  const now = input.clock.now();
  await db.insert(schema.schoolSessions).values({
    id: sessionId,
    schoolId: input.school.id,
    schoolAccountId: input.schoolAccount.id,
    userId: input.userId,
    tokenDigest: digestToken(token),
    authenticationMethod: input.authenticationMethod,
    authenticatedAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
  });
  const session: LearnerSession = {
    schoolAccount: input.schoolAccount,
    learner: Object.assign({}, input.schoolAccount, { name: input.schoolAccount.displayName }),
    school: input.school,
    sessionId,
    userId: input.userId,
    authenticationMethod: input.authenticationMethod,
  };
  return {
    token,
    dto: toLearnerDto(input.schoolAccount, input.school.publicId),
    session,
  };
}

export async function createSchoolAuthTicket(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    userId: string;
    authenticationMethod: "email" | "google";
    clock: Clock;
  },
): Promise<string> {
  const ticket = randomBytes(32).toString("base64url");
  const now = input.clock.now();
  const expiresAt = new Date(now.getTime() + 30 * 1000); // 30s TTL
  await db.insert(schema.schoolAuthTickets).values({
    id: uuidv7(input.clock),
    schoolId: input.schoolId,
    schoolAccountId: input.schoolAccountId,
    userId: input.userId,
    ticketDigest: digestToken(ticket),
    authenticationMethod: input.authenticationMethod,
    expiresAt,
    createdAt: now,
  });
  return ticket;
}

export async function consumeSchoolAuthTicket(
  db: AppDb,
  input: {
    ticket: string;
    clock: Clock;
  },
): Promise<
  | { ok: true; value: { sessionToken: string; dto: LearnerDto; session: LearnerSession } }
  | { ok: false; error: PlatformError }
> {
  const digest = digestToken(input.ticket);
  const now = input.clock.now();
  const rows = await db
    .select({
      ticket: schema.schoolAuthTickets,
      account: schema.schoolAccounts,
      school: schema.schools,
    })
    .from(schema.schoolAuthTickets)
    .innerJoin(
      schema.schoolAccounts,
      eq(schema.schoolAccounts.id, schema.schoolAuthTickets.schoolAccountId),
    )
    .innerJoin(schema.schools, eq(schema.schools.id, schema.schoolAuthTickets.schoolId))
    .where(
      and(
        eq(schema.schoolAuthTickets.ticketDigest, digest),
        isNull(schema.schoolAuthTickets.consumedAt),
        gt(schema.schoolAuthTickets.expiresAt, now),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  await db
    .update(schema.schoolAuthTickets)
    .set({ consumedAt: now })
    .where(eq(schema.schoolAuthTickets.id, row.ticket.id));

  const sessionRes = await issueSchoolSession(db, {
    school: row.school,
    schoolAccount: row.account,
    userId: row.ticket.userId,
    authenticationMethod: row.ticket.authenticationMethod,
    clock: input.clock,
  });
  return {
    ok: true,
    value: {
      sessionToken: sessionRes.token,
      dto: sessionRes.dto,
      session: sessionRes.session,
    },
  };
}

function learnerNameFromEmail(email: string): string {
  const localPart = email.split("@", 1)[0]?.trim();
  return (localPart || "Learner").slice(0, 200);
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

/**
 * Bridge a verified Better Auth user into the school account and session.
 */
export async function signInLearnerWithIdentity(
  db: AppDb,
  input: {
    userId: string;
    email: string;
    name?: string | null;
    image?: string | null;
    schoolPublicId: string;
    authenticationMethod?: "email" | "google";
  },
  clock: Clock,
  requestId: string,
): Promise<
  | {
      ok: true;
      value: LearnerDto;
      token: string;
      session: LearnerSession;
    }
  | { ok: false; error: PlatformError }
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }
  const authenticationMethod = input.authenticationMethod ?? "email";
  const hasGoogle = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
  const allowedMethods = hasGoogle ? ["email", "google"] : ["email"];
  if (!allowedMethods.includes(authenticationMethod)) {
    return { ok: false, error: createPlatformError("forbidden") };
  }

  const schoolAccount = await ensureSchoolAccount(db, {
    schoolId: school.id,
    userId: input.userId,
    email: input.email,
    displayName: input.name,
    image: input.image,
    clock,
  });

  if (schoolAccount.status !== "active") {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }

  const issued = await issueSchoolSession(db, {
    school,
    schoolAccount,
    userId: input.userId,
    authenticationMethod,
    clock,
  });

  await recordActivity(
    db,
    {
      schoolId: school.id,
      actorId: schoolAccount.publicId,
      type: ActivityType.USER_CREATED,
      entityId: schoolAccount.publicId,
      metadata: { email: schoolAccount.email },
    },
    clock,
  );
  await enqueueLearnerContactSync(
    db,
    school.id,
    { email: schoolAccount.email, name: schoolAccount.displayName },
    clock,
  );

  return {
    ok: true,
    value: issued.dto,
    token: issued.token,
    session: issued.session,
  };
}

/** Fallback/convenience for direct API sign-up tests */
export async function signUpLearner(
  db: AppDb,
  input: {
    email: string;
    password?: string;
    name: string;
    schoolPublicId: string;
  },
  clock: Clock,
  requestId: string,
): Promise<
  { ok: true; value: LearnerDto; token: string } | { ok: false; error: PlatformError }
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  const email = normalizeEmail(input.email);
  const now = clock.now();

  // Find or create global user
  let user = (
    await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
  )[0];
  if (!user) {
    const created = await db
      .insert(schema.user)
      .values({
        id: uuidv7(clock),
        name: input.name.trim() || learnerNameFromEmail(email),
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    user = created[0];
  }

  const schoolAccount = await ensureSchoolAccount(db, {
    schoolId: school.id,
    userId: user.id,
    email,
    displayName: input.name,
    clock,
  });

  const issued = await issueSchoolSession(db, {
    school,
    schoolAccount,
    userId: user.id,
    authenticationMethod: "email",
    clock,
  });

  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: school.id,
    actorId: schoolAccount.publicId,
    action: "learner.signed_up",
    resourceType: "learner",
    resourceId: schoolAccount.publicId,
    requestId,
    createdAt: now,
  });
  await recordActivity(
    db,
    {
      schoolId: school.id,
      actorId: schoolAccount.publicId,
      type: ActivityType.USER_CREATED,
      entityId: schoolAccount.publicId,
      metadata: { email: schoolAccount.email },
    },
    clock,
  );
  await enqueueLearnerContactSync(
    db,
    school.id,
    { email: schoolAccount.email, name: schoolAccount.displayName },
    clock,
  );

  return { ok: true, value: issued.dto, token: issued.token };
}

/** Fallback/convenience for direct API sign-in tests */
export async function signInLearner(
  db: AppDb,
  input: {
    email: string;
    password?: string;
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

  let user = (
    await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
  )[0];
  if (!user) {
    const created = await db
      .insert(schema.user)
      .values({
        id: uuidv7(clock),
        name: learnerNameFromEmail(email),
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    user = created[0];
  }

  const schoolAccount = await ensureSchoolAccount(db, {
    schoolId: school.id,
    userId: user.id,
    email,
    clock,
  });

  if (schoolAccount.status !== "active") {
    return { ok: false, error: createPlatformError("unauthenticated") };
  }

  const issued = await issueSchoolSession(db, {
    school,
    schoolAccount,
    userId: user.id,
    authenticationMethod: "email",
    clock,
  });

  return { ok: true, value: issued.dto, token: issued.token };
}

export async function signOutLearner(
  db: AppDb,
  session: LearnerSession,
): Promise<void> {
  await db
    .delete(schema.schoolSessions)
    .where(eq(schema.schoolSessions.id, session.sessionId));
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

function learnerMembershipToDto(
  row: typeof schema.learnerMemberships.$inferSelect,
  publicSchoolId: string,
): LearnerMembershipDto {
  return {
    id: row.publicId,
    schoolId: publicSchoolId,
    entityType: row.entityType,
    entityId: row.entityId,
    paymentPlanId: row.paymentPlanId,
    status: row.status,
    role: row.role,
    subscriptionId: row.subscriptionId,
    subscriptionMethod: row.subscriptionMethod,
    joiningReason: row.joiningReason,
    rejectionReason: row.rejectionReason,
    isIncludedInPlan: row.isIncludedInPlan,
  };
}

export async function ensureLearnerProductMembership(
  db: AppDb,
  input: {
    schoolId: string;
    publicSchoolId: string;
    schoolAccountId?: string;
    learnerId?: string;
    actorId: string;
    product: typeof schema.products.$inferSelect;
    paymentPlanId?: string | null;
    status?:
      | "active"
      | "payment_failed"
      | "expired"
      | "pending"
      | "rejected"
      | "paused";
    role?: "comment" | "post" | "moderate" | null;
    joiningReason?: string;
    rejectionReason?: string | null;
    sessionId?: string | null;
    isIncludedInPlan?: boolean;
    parentMembershipId?: string | null;
    requestId: string;
  },
  clock: Clock,
): Promise<LearnerMembershipDto> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
  const now = clock.now();
  const membership = await upsertLearnerMembership(
    db,
    {
      schoolId: input.schoolId,
      schoolAccountId: accountId,
      entityType: "product",
      entityId: input.product.publicId,
      paymentPlanId: input.paymentPlanId,
      status: input.status ?? "active",
      role: input.role,
      joiningReason: input.joiningReason,
      rejectionReason: input.rejectionReason,
      sessionId: input.sessionId,
      isIncludedInPlan: input.isIncludedInPlan,
      parentMembershipId: input.parentMembershipId,
    },
    clock,
  );
  await db.insert(schema.auditEvents).values({
    id: uuidv7(clock),
    schoolId: input.schoolId,
    actorId: input.actorId,
    action: "membership.created",
    resourceType: "learner_membership",
    resourceId: membership.publicId,
    requestId: input.requestId,
    createdAt: now,
  });
  await recordActivity(
    db,
    {
      schoolId: input.schoolId,
      actorId: accountId,
      type: ActivityType.ENROLLED,
      entityId: input.product.publicId,
      metadata: { membershipId: membership.publicId },
    },
    clock,
  );
  return learnerMembershipToDto(membership, input.publicSchoolId);
}

export async function ensureLearnerProductMembershipForPublicSignup(
  db: AppDb,
  input: {
    schoolId: string;
    publicSchoolId: string;
    schoolAccountId?: string;
    learnerId?: string;
    actorId: string;
    productPublicId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: LearnerMembershipDto } | { ok: false; error: PlatformError }> {
  const product = await loadPublishedProductInSchool(
    db,
    input.schoolId,
    input.productPublicId,
  );
  if (product?.status !== "published") {
    return { ok: false, error: createPlatformError("not_found") };
  }
  return db.transaction(async (tx) => {
    const value = await ensureLearnerProductMembership(
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

export async function grantLearnerMembership(
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
): Promise<{ ok: true; value: LearnerMembershipDto } | { ok: false; error: PlatformError }> {
  const email = normalizeEmail(input.email);
  const now = clock.now();
  let user = (
    await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1)
  )[0];
  if (!user) {
    const created = await db
      .insert(schema.user)
      .values({
        id: uuidv7(clock),
        name: input.name.trim() || learnerNameFromEmail(email),
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    user = created[0];
  }
  const schoolAccount = await ensureSchoolAccount(db, {
    schoolId: input.schoolId,
    userId: user.id,
    email,
    displayName: input.name,
    clock,
  });

  return ensureLearnerProductMembershipForPublicSignup(
    db,
    {
      schoolId: input.schoolId,
      publicSchoolId: input.publicSchoolId,
      schoolAccountId: schoolAccount.id,
      actorId: input.actorId,
      productPublicId: input.productPublicId,
      requestId: input.requestId,
    },
    clock,
  );
}

export async function completeLesson(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId?: string;
    learnerId?: string;
    actorId: string;
    lessonPublicId: string;
    requestId: string;
  },
  clock: Clock,
): Promise<{ ok: true; value: ProgressDto } | { ok: false; error: PlatformError }> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
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
  const membership = await activeProductMembershipForLesson(db, {
    schoolId: input.schoolId,
    schoolAccountId: accountId,
    productPublicId: row.product.publicId,
  });
  if (!membership) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const membershipStartedAt = membership.createdAt;
  const sectionAccess = await sectionAccessForLesson(
    db,
    row.lesson,
    membershipStartedAt,
  );
  const availableAt = latestUnlockAt(
    lessonUnlockAt(row.lesson, membershipStartedAt),
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
          eq(schema.lessonEvaluations.membershipId, membership.id),
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
          eq(schema.scormRuntimeStates.membershipId, membership.id),
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
          eq(schema.lessonProgress.membershipId, membership.id),
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
        await recordActivity(
          tx as unknown as AppDb,
          {
            schoolId: input.schoolId,
            actorId: accountId,
            type: ActivityType.LESSON_COMPLETED,
            entityId: row.lesson.publicId,
            metadata: { productId: row.product.publicId },
          },
          clock,
        );
      }
      const completion = await issueCertificateIfComplete(
        tx as unknown as AppDb,
        {
          schoolId: input.schoolId,
          productId: row.product.id,
          schoolAccountId: accountId,
          membershipId: membership.id,
          actorId: input.actorId,
          requestId: input.requestId,
        },
        clock,
      );
      if (completion.courseCompleted) {
        await recordActivity(
          tx as unknown as AppDb,
          {
            schoolId: input.schoolId,
            actorId: accountId,
            type: ActivityType.COURSE_COMPLETED,
            entityId: row.product.publicId,
          },
          clock,
        );
      }
      const completedAt = existing[0].completedAt ?? now;
      return {
        ok: true as const,
        value: {
          lessonId: row.lesson.publicId,
          membershipId: membership.publicId,
          startedAt: serializeDate(existing[0].startedAt),
          completedAt: serializeDate(completedAt),
          ...completion,
        },
      };
    }
    await tx.insert(schema.lessonProgress).values({
      id: uuidv7(clock),
      schoolId: input.schoolId,
      membershipId: membership.id,
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
    await recordActivity(
      tx as unknown as AppDb,
      {
        schoolId: input.schoolId,
        actorId: accountId,
        type: ActivityType.LESSON_COMPLETED,
        entityId: row.lesson.publicId,
        metadata: { productId: row.product.publicId },
      },
      clock,
    );
    const completion = await issueCertificateIfComplete(
      tx as unknown as AppDb,
      {
        schoolId: input.schoolId,
        productId: row.product.id,
        schoolAccountId: accountId,
        membershipId: membership.id,
        actorId: input.actorId,
        requestId: input.requestId,
      },
      clock,
    );
    if (completion.courseCompleted) {
      await recordActivity(
        tx as unknown as AppDb,
        {
          schoolId: input.schoolId,
          actorId: accountId,
          type: ActivityType.COURSE_COMPLETED,
          entityId: row.product.publicId,
        },
        clock,
      );
    }
    return {
      ok: true as const,
      value: {
        lessonId: row.lesson.publicId,
        membershipId: membership.publicId,
        startedAt: serializeDate(now),
        completedAt: serializeDate(now),
        ...completion,
      },
    };
  });
}

export async function listLearnerProgress(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId?: string;
    learnerId?: string;
    productPublicId: string;
  },
): Promise<
  { ok: true; value: LessonProgressDto[] } | { ok: false; error: PlatformError }
> {
  const accountId = input.schoolAccountId ?? input.learnerId!;
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
  const membership = await activeProductMembershipForLesson(db, {
    schoolId: input.schoolId,
    schoolAccountId: accountId,
    productPublicId: input.productPublicId,
  });
  if (!membership) return { ok: true, value: [] };
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
        eq(schema.lessonProgress.membershipId, membership.id),
      ),
    )
    .orderBy(asc(schema.lessonProgress.startedAt));
  return {
    ok: true,
    value: rows.map(({ progress, lessonPublicId }) => ({
      lessonId: lessonPublicId,
      membershipId: membership.publicId,
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

function canReadLearners(ctx: AdminLearnerContext): boolean {
  return Boolean(ctx.schoolId && ctx.permissions.has("learners:read"));
}

function canWriteLearners(ctx: AdminLearnerContext): boolean {
  return Boolean(ctx.schoolId && ctx.permissions.has("learners:write"));
}

export async function createLearnerIdentityLink(
  _db: AppDb,
  ctx: AdminLearnerContext,
  clock: Clock,
): Promise<
  { ok: true; value: LearnerIdentityLinkDto } | { ok: false; error: PlatformError }
> {
  if (!canWriteLearners(ctx)) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  const expiresAt = new Date(clock.now().getTime() + 3600000);
  return {
    ok: true,
    value: {
      token: randomBytes(32).toString("base64url"),
      expiresAt: serializeDate(expiresAt),
    },
  };
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
    .from(schema.schoolAccounts)
    .where(
      and(
        eq(schema.schoolAccounts.schoolId, ctx.schoolId!),
        cursor
          ? or(
              gt(schema.schoolAccounts.createdAt, cursor.createdAt),
              and(
                eq(schema.schoolAccounts.createdAt, cursor.createdAt),
                gt(schema.schoolAccounts.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .orderBy(asc(schema.schoolAccounts.createdAt), asc(schema.schoolAccounts.id))
    .limit(input.limit + 1);
  const hasMore = rows.length > input.limit;
  const page = hasMore ? rows.slice(0, input.limit) : rows;
  return {
    ok: true,
    value: {
      items: page.map((account) => adminLearnerToDto(account, ctx.publicSchoolId)),
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
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.publicId, learnerPublicId),
          eq(schema.schoolAccounts.schoolId, ctx.schoolId!),
        ),
      )
      .limit(1);
    const account = rows[0];
    if (!account) {
      return { ok: false as const, error: createPlatformError("not_found") };
    }
    if (account.status !== status) {
      await tx
        .update(schema.schoolAccounts)
        .set({ status, updatedAt: now })
        .where(eq(schema.schoolAccounts.id, account.id));
      if (status === "deactivated") {
        await tx
          .delete(schema.schoolSessions)
          .where(eq(schema.schoolSessions.schoolAccountId, account.id));
      }
      await tx.insert(schema.auditEvents).values({
        id: uuidv7(clock),
        schoolId: ctx.schoolId!,
        actorId: ctx.principalId,
        action: status === "active" ? "learner.restored" : "learner.deactivated",
        resourceType: "learner",
        resourceId: account.publicId,
        requestId: ctx.requestId,
        createdAt: now,
      });
    }
    return {
      ok: true as const,
      value: adminLearnerToDto(
        { ...account, status, updatedAt: now },
        ctx.publicSchoolId,
      ),
    };
  });
}

export function learnerMe(
  session: LearnerSession,
  profile?: LearnerProfileFields,
): LearnerDto {
  return toLearnerDto(session.schoolAccount, session.school.publicId, profile);
}

export async function updateLearnerProfile(
  db: AppDb,
  session: LearnerSession,
  input: {
    name: string;
    image?: string | null;
    avatarMediaId?: string | null;
    bio?: string;
    emailUpdatesEnabled?: boolean;
  },
  clock: Clock,
  requestId: string,
  sendLit: import("./sendlit-client.js").SendLitConfig,
): Promise<{ ok: true; value: LearnerDto } | { ok: false; error: PlatformError }> {
  const name = input.name.trim();
  if (!name || name.length > 200) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  if ((input.bio ?? "").length > 2_000) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }

  const profileRequested =
    input.image !== undefined ||
    input.avatarMediaId !== undefined ||
    input.bio !== undefined ||
    input.emailUpdatesEnabled !== undefined;
  let profile: LearnerProfileFields | undefined;
  if (profileRequested) {
    try {
      const existingProfile = await readLearnerProfile(db, sendLit, {
        schoolId: session.school.id,
        email: session.schoolAccount.email,
      });
      const updatedProfile = await updateLearnerProfileContact(db, sendLit, {
        schoolId: session.school.id,
        email: session.schoolAccount.email,
        name,
        bio: input.bio ?? existingProfile.bio,
        emailUpdatesEnabled:
          input.emailUpdatesEnabled ?? existingProfile.emailUpdatesEnabled,
        avatarMediaId:
          input.avatarMediaId !== undefined
            ? input.avatarMediaId
            : existingProfile.avatarMediaId,
        avatarUrl: input.image !== undefined ? input.image : existingProfile.image,
      });
      if (!updatedProfile) {
        return { ok: false, error: createPlatformError("internal_error") };
      }
      profile = updatedProfile;
    } catch {
      return { ok: false, error: createPlatformError("internal_error") };
    }
  }

  const now = clock.now();
  return db.transaction(async (tx) => {
    const updates: Partial<typeof schema.schoolAccounts.$inferInsert> = {
      updatedAt: now,
    };
    if (name !== session.schoolAccount.displayName) updates.displayName = name;
    const updated = await tx
      .update(schema.schoolAccounts)
      .set(updates)
      .where(
        and(
          eq(schema.schoolAccounts.id, session.schoolAccount.id),
          eq(schema.schoolAccounts.schoolId, session.school.id),
        ),
      )
      .returning();
    const account = updated[0];
    if (!account) {
      return { ok: false as const, error: createPlatformError("unauthenticated") };
    }

    await enqueueLearnerContactSync(
      tx as unknown as AppDb,
      session.school.id,
      { email: account.email, name: account.displayName },
      clock,
    );
    await tx.insert(schema.auditEvents).values({
      id: uuidv7(clock),
      schoolId: session.school.id,
      actorId: account.publicId,
      action: "learner.profile_updated",
      resourceType: "learner",
      resourceId: account.publicId,
      requestId,
      createdAt: now,
    });

    return {
      ok: true as const,
      value: toLearnerDto(account, session.school.publicId, profile),
    };
  });
}
