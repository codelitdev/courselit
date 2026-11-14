// Test-only stand-ins for learner sign-up and sign-in. They hand out a school
// session for any email without proof, so they must never be reachable over
// HTTP; production learners sign in with an emailed code or Google
// (learner-sign-in.ts).
import {
  type Clock,
  createPlatformError,
  type PlatformError,
  toPublicHttpError,
  uuidv7,
} from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import { ActivityType, recordActivity } from "./activities.js";
import * as schema from "./db/schema/index.js";
import {
  type DispatchDeps,
  type DispatchOptions,
  dispatch as realDispatch,
} from "./dispatch.js";
import { normalizeEmail } from "./invitations.js";
import {
  enqueueLearnerContactSync,
  ensureSchoolAccount,
  issueSchoolSession,
  type LearnerDto,
  learnerSessionCookieHeader,
} from "./learners.js";
import { loadSchoolByPublicId } from "./schools.js";
import type { AppDb, DispatchResponse, IncomingRequest } from "./types.js";

function learnerNameFromEmail(email: string): string {
  const localPart = email.split("@", 1)[0]?.trim();
  return (localPart || "Learner").slice(0, 200);
}

/** Signs a learner up without proof of the email address. Tests only. */
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
  if (!issued.ok) return issued;

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
  await db
    .update(schema.schoolAccounts)
    .set({
      learnerRegisteredAt: now,
      lastActiveAt: now,
      updatedAt: now,
    })
    .where(eq(schema.schoolAccounts.id, schoolAccount.id));

  await enqueueLearnerContactSync(
    db,
    school.id,
    {
      email: schoolAccount.email,
      name: schoolAccount.displayName,
      id: schoolAccount.id,
    },
    clock,
    { ensureSubscribed: true, reason: "learner_signup" },
  );

  return { ok: true, value: issued.value.dto, token: issued.value.token };
}

/** Signs a learner in without proof of the email address. Tests only. */
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
  if (!issued.ok) return issued;

  const updates: Partial<typeof schema.schoolAccounts.$inferInsert> = {
    lastActiveAt: now,
    updatedAt: now,
  };
  if (!schoolAccount.learnerRegisteredAt) {
    updates.learnerRegisteredAt = now;
  }
  await db
    .update(schema.schoolAccounts)
    .set(updates)
    .where(eq(schema.schoolAccounts.id, schoolAccount.id));

  await enqueueLearnerContactSync(
    db,
    school.id,
    {
      email: schoolAccount.email,
      name: schoolAccount.displayName,
      id: schoolAccount.id,
    },
    clock,
    { reason: "learner_login" },
  );

  return { ok: true, value: issued.value.dto, token: issued.value.token };
}

/**
 * `dispatch` plus the two test-only learner routes the API no longer serves:
 * `POST /v1/learner/auth/sign-up` and `POST /v1/learner/auth/sign-in`.
 */
export async function dispatch(
  deps: DispatchDeps,
  request: IncomingRequest,
  options: DispatchOptions = {},
): Promise<DispatchResponse> {
  const path = request.path.split("?", 1)[0];
  const isSignUp = path === "/v1/learner/auth/sign-up";
  if (request.method !== "POST" || (!isSignUp && path !== "/v1/learner/auth/sign-in")) {
    return realDispatch(deps, request, options);
  }
  const body = (request.body ?? {}) as {
    email?: string;
    password?: string;
    name?: string;
    schoolId?: string;
  };
  if (!body.email || !body.schoolId || (isSignUp && !body.name)) {
    return { status: 400, body: { code: "validation_failed" } };
  }
  const input = {
    email: body.email,
    password: body.password,
    name: body.name ?? "",
    schoolPublicId: body.schoolId,
  };
  const result = isSignUp
    ? await signUpLearner(deps.db, input, deps.clock, "test")
    : await signInLearner(deps.db, input, deps.clock, "test");
  if (!result.ok) {
    const mapped = toPublicHttpError(result.error);
    return { status: mapped.status, body: mapped.body };
  }
  return {
    status: isSignUp ? 201 : 200,
    body: result.value,
    headers: { "Set-Cookie": learnerSessionCookieHeader(result.token) },
  };
}
