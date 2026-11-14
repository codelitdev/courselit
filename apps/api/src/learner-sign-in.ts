import { randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  uuidv7,
} from "@codelitdev/platform";
import { safeRedirectPath } from "@courselit/api-contract";
import { and, count, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { normalizeEmail } from "./invitations.js";
import {
  admitLearner,
  digestToken,
  findOrCreateVerifiedUser,
  issueSchoolSession,
  type LearnerDto,
  type LearnerSession,
  learnerNameIsPlaceholder,
  signInLearnerWithIdentity,
} from "./learners.js";
import { queueSchoolEmail, renderSchoolEmail } from "./school-emails.js";
import { isShadowUserEmail } from "./shadow-users.js";
import { type SignInMethod, sessionMethodAllowed } from "./sign-in-policy.js";
import { loadSchoolByPublicId, resolveSchoolByHost } from "./schools.js";
import type { AppDb } from "./types.js";

// Learners sign in to one school at a time. Every way in on a school's own
// website ends in a session for that school only; nothing here creates a
// CourseLit-wide session on a host the school controls.

const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const EMAIL_CODE_RESEND_MS = 30 * 1000;
const EMAIL_CODE_HOURLY_LIMIT = 5;
const GOOGLE_REQUEST_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 60 * 1000;
const MIN_NONCE_LENGTH = 32;

type Result<T> = { ok: true; value: T } | { ok: false; error: PlatformError };

const signInFailed = (reason: string) =>
  createPlatformError("unauthenticated", { safeDetails: { reason } });

/**
 * Refuse a sign-in method the school has switched off, or that its SSO
 * enforcement forbids for this address, before anything is sent or admitted.
 */
async function methodRefusal(
  db: AppDb,
  school: typeof schema.schools.$inferSelect,
  method: SignInMethod,
  email: string | null,
): Promise<PlatformError | null> {
  const policy = await sessionMethodAllowed(db, { school, email, method });
  return policy.allowed
    ? null
    : createPlatformError("forbidden", { safeDetails: { reason: policy.reason } });
}

function codeDigest(codeId: string, code: string): string {
  return digestToken(`${codeId}:${code}`);
}

function sameDigest(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** A same-site path to land on after signing in; anything else becomes `/dashboard`. */
export function safeNextPath(next: string | null | undefined): string {
  return safeRedirectPath(next, "/dashboard");
}

/** The sign-in code email, sent in the school's name like its other email. */
export function learnerCodeEmail(
  schoolName: string,
  code: string,
): { subject: string; html: string; text: string } {
  return {
    subject: `Sign in to ${schoolName}`,
    ...renderSchoolEmail({
      schoolName,
      paragraphs: [`Enter this code to sign in to ${schoolName}:`],
      code,
      footer: {
        text: `The code expires in ${EMAIL_CODE_TTL_MS / 60_000} minutes. If you didn't ask for it, you can ignore this email.`,
      },
    }),
  };
}

/** Email a six-digit sign-in code that only works for this school. */
export async function requestLearnerEmailCode(
  db: AppDb,
  input: { schoolPublicId: string; email: string },
  clock: Clock,
  deliver?: (message: { email: string; otp: string }) => Promise<void>,
): Promise<Result<null>> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) return { ok: false, error: createPlatformError("tenant_required") };
  const email = normalizeEmail(input.email);
  if (isShadowUserEmail(email)) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const refusal = await methodRefusal(db, school, "email", email);
  if (refusal) return { ok: false, error: refusal };
  const now = clock.now();
  const recent = await db
    .select({
      sent: count(),
      latest: sql<Date | null>`max(${schema.schoolLoginCodes.createdAt})`,
    })
    .from(schema.schoolLoginCodes)
    .where(
      and(
        eq(schema.schoolLoginCodes.schoolId, school.id),
        eq(schema.schoolLoginCodes.email, email),
        gt(schema.schoolLoginCodes.createdAt, new Date(now.getTime() - 60 * 60 * 1000)),
      ),
    );
  const latest = recent[0]?.latest ? new Date(recent[0].latest) : null;
  if (
    Number(recent[0]?.sent ?? 0) >= EMAIL_CODE_HOURLY_LIMIT ||
    (latest && now.getTime() - latest.getTime() < EMAIL_CODE_RESEND_MS)
  ) {
    return { ok: false, error: createPlatformError("rate_limited") };
  }
  const id = uuidv7(clock);
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.insert(schema.schoolLoginCodes).values({
    id,
    schoolId: school.id,
    email,
    codeDigest: codeDigest(id, code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + EMAIL_CODE_TTL_MS),
    createdAt: now,
  });
  if (deliver) {
    await deliver({ email, otp: code });
  } else {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[Learner sign-in code] ${school.name} for ${email}: ${code}`);
    }
    await queueSchoolEmail(
      db,
      school.id,
      {
        to: email,
        idempotencyKey: `learner-sign-in-code:${id}`,
        ...learnerCodeEmail(school.name, code),
      },
      clock,
    );
  }
  return { ok: true, value: null };
}

/**
 * Check a sign-in code and, when it matches, sign the learner in to the school
 * the code was sent for. Each code allows a few wrong guesses, then stops
 * working.
 */
export async function verifyLearnerEmailCode(
  db: AppDb,
  input: { schoolPublicId: string; email: string; code: string },
  clock: Clock,
): Promise<
  Result<{
    dto: LearnerDto;
    token: string;
    session: LearnerSession;
    /** True while the learner's name is still the one made from their email. */
    needsName: boolean;
  }>
> {
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) return { ok: false, error: createPlatformError("tenant_required") };
  const email = normalizeEmail(input.email);
  const now = clock.now();
  const [row] = await db
    .select()
    .from(schema.schoolLoginCodes)
    .where(
      and(
        eq(schema.schoolLoginCodes.schoolId, school.id),
        eq(schema.schoolLoginCodes.email, email),
        isNull(schema.schoolLoginCodes.consumedAt),
        gt(schema.schoolLoginCodes.expiresAt, now),
      ),
    )
    .orderBy(desc(schema.schoolLoginCodes.createdAt))
    .limit(1);
  if (!row) return { ok: false, error: signInFailed("invalid_code") };
  // Count the attempt before comparing the code, in one conditional update.
  // Reading the count and incrementing it after a wrong guess let guesses
  // sent at the same time all pass the limit check, so one code could be
  // guessed far more than EMAIL_CODE_MAX_ATTEMPTS times.
  const counted = await db
    .update(schema.schoolLoginCodes)
    .set({ attempts: sql`${schema.schoolLoginCodes.attempts} + 1` })
    .where(
      and(
        eq(schema.schoolLoginCodes.id, row.id),
        isNull(schema.schoolLoginCodes.consumedAt),
        lt(schema.schoolLoginCodes.attempts, EMAIL_CODE_MAX_ATTEMPTS),
      ),
    )
    .returning({ id: schema.schoolLoginCodes.id });
  if (!counted[0]) return { ok: false, error: signInFailed("invalid_code") };
  if (!sameDigest(codeDigest(row.id, input.code.trim()), row.codeDigest)) {
    return { ok: false, error: signInFailed("invalid_code") };
  }
  const claimed = await db
    .update(schema.schoolLoginCodes)
    .set({ consumedAt: now })
    .where(
      and(
        eq(schema.schoolLoginCodes.id, row.id),
        isNull(schema.schoolLoginCodes.consumedAt),
      ),
    )
    .returning({ id: schema.schoolLoginCodes.id });
  if (!claimed[0]) return { ok: false, error: signInFailed("invalid_code") };

  const user = await findOrCreateVerifiedUser(db, email, clock);
  const signedIn = await signInLearnerWithIdentity(
    db,
    {
      userId: user.id,
      email,
      name: user.name,
      image: user.image,
      schoolPublicId: school.publicId,
      authenticationMethod: "email",
    },
    clock,
  );
  if (!signedIn.ok) return signedIn;
  return {
    ok: true,
    value: {
      dto: signedIn.value,
      token: signedIn.token,
      session: signedIn.session,
      needsName: learnerNameIsPlaceholder(signedIn.value.name, email),
    },
  };
}

export function originForHost(host: string): string | null {
  const value = host.trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/.test(value)) return null;
  const hostname = value.replace(/:\d+$/, "");
  const local = hostname === "localhost" || hostname.endsWith(".localhost");
  return `${local ? "http" : "https"}://${value}`;
}

/**
 * Begin "Sign in with Google" for a school website. The storefront calls this
 * server-to-server with the host the learner is on and a random nonce it has
 * also put in a cookie on that host. Google sign-in then runs on the API host,
 * and the learner comes back to the same school host with a ticket that only
 * that browser can redeem.
 */
export async function startLearnerGoogleSignIn(
  db: AppDb,
  input: {
    schoolPublicId: string;
    host: string;
    nonce: string;
    next?: string | null;
    publicApiUrl: string;
  },
  clock: Clock,
): Promise<Result<{ url: string }>> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return { ok: false, error: createPlatformError("forbidden") };
  }
  if (input.nonce.length < MIN_NONCE_LENGTH) {
    return { ok: false, error: createPlatformError("validation_failed") };
  }
  const origin = originForHost(input.host);
  const school = origin ? await resolveSchoolByHost(db, input.host) : null;
  if (!origin || !school || school.publicId !== input.schoolPublicId) {
    return { ok: false, error: createPlatformError("tenant_forbidden") };
  }
  // The address isn't known until Google returns; the finish step checks it.
  const refusal = await methodRefusal(db, school, "google", null);
  if (refusal) return { ok: false, error: refusal };
  const token = randomBytes(32).toString("base64url");
  const now = clock.now();
  await db.insert(schema.schoolLoginRequests).values({
    id: uuidv7(clock),
    requestDigest: digestToken(token),
    schoolId: school.id,
    nonceDigest: digestToken(input.nonce),
    returnOrigin: origin,
    nextPath: safeNextPath(input.next),
    expiresAt: new Date(now.getTime() + GOOGLE_REQUEST_TTL_MS),
    createdAt: now,
  });
  const url = new URL("/learner-login/google", input.publicApiUrl);
  url.searchParams.set("request", token);
  return { ok: true, value: { url: url.toString() } };
}

/** The open Google sign-in request a token names, without using it up. */
export async function findLearnerGoogleRequest(db: AppDb, token: string, clock: Clock) {
  const [row] = await db
    .select()
    .from(schema.schoolLoginRequests)
    .where(
      and(
        eq(schema.schoolLoginRequests.requestDigest, digestToken(token)),
        isNull(schema.schoolLoginRequests.consumedAt),
        gt(schema.schoolLoginRequests.expiresAt, clock.now()),
      ),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Finish a Google sign-in on the API host: use up the request, admit the
 * Google-verified person into the school that started it, and return where to
 * send the browser. The ticket in that URL works once, within a minute, only
 * on that school's host and only alongside the nonce cookie set when the
 * learner started.
 */
export async function finishLearnerGoogleSignIn(
  db: AppDb,
  input: {
    requestToken: string;
    user: { id: string; email: string; name?: string | null; image?: string | null };
  },
  clock: Clock,
): Promise<Result<{ redirectUrl: string }>> {
  const now = clock.now();
  const [request] = await db
    .update(schema.schoolLoginRequests)
    .set({ consumedAt: now })
    .where(
      and(
        eq(schema.schoolLoginRequests.requestDigest, digestToken(input.requestToken)),
        isNull(schema.schoolLoginRequests.consumedAt),
        gt(schema.schoolLoginRequests.expiresAt, now),
      ),
    )
    .returning();
  if (!request) return { ok: false, error: signInFailed("sign_in_request_expired") };
  const [school] = await db
    .select()
    .from(schema.schools)
    .where(eq(schema.schools.id, request.schoolId))
    .limit(1);
  if (!school) return { ok: false, error: createPlatformError("tenant_required") };
  const refusal = await methodRefusal(db, school, "google", input.user.email);
  if (refusal) return { ok: false, error: refusal };
  const admitted = await admitLearner(
    db,
    {
      userId: input.user.id,
      email: input.user.email,
      name: input.user.name,
      image: input.user.image,
      school,
      authenticationMethod: "google",
    },
    clock,
  );
  if (!admitted.ok) return admitted;
  const ticket = await createSchoolAuthTicket(db, {
    schoolId: school.id,
    schoolAccountId: admitted.value.id,
    userId: input.user.id,
    authenticationMethod: "google",
    nonceDigest: request.nonceDigest,
    clock,
  });
  const url = new URL("/auth/complete", request.returnOrigin);
  url.searchParams.set("next", request.nextPath);
  url.hash = new URLSearchParams({ ticket }).toString();
  return { ok: true, value: { redirectUrl: url.toString() } };
}

/** Where to send the browser when a Google sign-in fails or is cancelled. */
export async function learnerGoogleFailureUrl(
  db: AppDb,
  token: string,
): Promise<string | null> {
  // Used or expired requests still name the school to send the learner back to.
  const [request] = await db
    .select()
    .from(schema.schoolLoginRequests)
    .where(eq(schema.schoolLoginRequests.requestDigest, digestToken(token)))
    .limit(1);
  if (!request) return null;
  const url = new URL("/login", request.returnOrigin);
  url.searchParams.set("error", "google");
  if (request.nextPath !== "/dashboard") url.searchParams.set("next", request.nextPath);
  return url.toString();
}

export async function createSchoolAuthTicket(
  db: AppDb,
  input: {
    schoolId: string;
    schoolAccountId: string;
    userId: string;
    authenticationMethod: "email" | "google" | "sso";
    /** For `sso`: the connection the session will belong to. */
    ssoConnectionId?: string | null;
    /** For `sso`: the IdP's session end, when earlier than the default. */
    sessionExpiresAt?: Date | null;
    nonceDigest: string;
    clock: Clock;
  },
): Promise<string> {
  const ticket = randomBytes(32).toString("base64url");
  const now = input.clock.now();
  await db.insert(schema.schoolAuthTickets).values({
    id: uuidv7(input.clock),
    schoolId: input.schoolId,
    schoolAccountId: input.schoolAccountId,
    userId: input.userId,
    ticketDigest: digestToken(ticket),
    nonceDigest: input.nonceDigest,
    authenticationMethod: input.authenticationMethod,
    ssoConnectionId: input.ssoConnectionId ?? null,
    sessionExpiresAt: input.sessionExpiresAt ?? null,
    expiresAt: new Date(now.getTime() + TICKET_TTL_MS),
    createdAt: now,
  });
  return ticket;
}

/**
 * Swap a ticket for a school session. The ticket must be unused, unexpired,
 * for the school whose website is asking, and presented with the nonce from
 * the browser that started the sign-in. Using it up and checking it happen in
 * one conditional update, so two requests can't both redeem it.
 */
export async function consumeSchoolAuthTicket(
  db: AppDb,
  input: { ticket: string; nonce: string | null; schoolPublicId: string | null },
  clock: Clock,
): Promise<Result<{ sessionToken: string; dto: LearnerDto; session: LearnerSession }>> {
  if (!input.nonce || !input.schoolPublicId) {
    return { ok: false, error: signInFailed("invalid_ticket") };
  }
  const school = await loadSchoolByPublicId(db, input.schoolPublicId);
  if (!school) return { ok: false, error: signInFailed("invalid_ticket") };
  const now = clock.now();
  const [ticket] = await db
    .update(schema.schoolAuthTickets)
    .set({ consumedAt: now })
    .where(
      and(
        eq(schema.schoolAuthTickets.ticketDigest, digestToken(input.ticket)),
        eq(schema.schoolAuthTickets.schoolId, school.id),
        eq(schema.schoolAuthTickets.nonceDigest, digestToken(input.nonce)),
        isNull(schema.schoolAuthTickets.consumedAt),
        gt(schema.schoolAuthTickets.expiresAt, now),
      ),
    )
    .returning();
  if (!ticket) return { ok: false, error: signInFailed("invalid_ticket") };
  const [account] = await db
    .select()
    .from(schema.schoolAccounts)
    .where(eq(schema.schoolAccounts.id, ticket.schoolAccountId))
    .limit(1);
  if (!account || account.status !== "active") {
    return { ok: false, error: signInFailed("invalid_ticket") };
  }
  const issued = await issueSchoolSession(db, {
    school,
    schoolAccount: account,
    userId: ticket.userId,
    authenticationMethod: ticket.authenticationMethod,
    ssoConnectionId: ticket.ssoConnectionId,
    expiresAt: ticket.sessionExpiresAt,
    clock,
  });
  if (!issued.ok) return issued;
  return {
    ok: true,
    value: {
      sessionToken: issued.value.token,
      dto: issued.value.dto,
      session: issued.value.session,
    },
  };
}
