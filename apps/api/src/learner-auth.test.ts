import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("learner OTP authentication", () => {
  it("creates a school-local learner without storing or returning the OTP", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const deliveries: Array<{
      schoolId: string;
      schoolPublicId: string;
      email: string;
      otp: string;
      expiresAt: Date;
    }> = [];
    const runtime = await createPgliteRuntime({
      clock,
      learnerOtpDelivery: async (input) => {
        deliveries.push(input);
      },
    });
    const world = await seedWorld(runtime, clock);

    const requested = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/request-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "Otp-Learner@Example.com" },
    });
    expect(requested.status).toBe(202);
    expect(requested.body).toMatchObject({
      expiresAt: "2026-03-01T00:10:00.000Z",
    });
    expect(JSON.stringify(requested.body)).not.toMatch(/\d{6}/);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      schoolPublicId: world.schoolA.publicId,
      email: "otp-learner@example.com",
    });

    const challenges = await runtime.db
      .select()
      .from(schema.learnerOtpChallenges)
      .where(
        and(
          eq(schema.learnerOtpChallenges.schoolId, world.schoolA.id),
          eq(schema.learnerOtpChallenges.email, "otp-learner@example.com"),
        ),
      );
    expect(challenges).toHaveLength(1);
    expect(challenges[0]!.codeDigest).not.toBe(deliveries[0]!.otp);
    expect(challenges[0]!.codeDigest).toContain(":");

    const verified = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/verify-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "otp-learner@example.com",
        otp: deliveries[0]!.otp,
        name: "OTP Learner",
      },
    });
    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({
      email: "otp-learner@example.com",
      name: "OTP Learner",
      schoolId: world.schoolA.publicId,
    });
    expect(verified.headers?.["Set-Cookie"]).toContain("courselit.learner.session=");

    const learners = await runtime.db
      .select()
      .from(schema.learners)
      .where(
        and(
          eq(schema.learners.schoolId, world.schoolA.id),
          eq(schema.learners.email, "otp-learner@example.com"),
        ),
      );
    expect(learners).toHaveLength(1);
    const credentials = await runtime.db
      .select()
      .from(schema.learnerCredentials)
      .where(eq(schema.learnerCredentials.learnerId, learners[0]!.id));
    expect(credentials).toHaveLength(0);
    expect(challenges[0]!.consumedAt).toBeNull();
    const consumed = await runtime.db
      .select()
      .from(schema.learnerOtpChallenges)
      .where(eq(schema.learnerOtpChallenges.id, challenges[0]!.id));
    expect(consumed[0]!.consumedAt).toEqual(clock.now());

    const replay = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/verify-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "otp-learner@example.com", otp: deliveries[0]!.otp },
    });
    expect(replay.status).toBe(401);
    await runtime.close();
  });

  it("invalidates prior challenges and locks a challenge after five failed attempts", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const deliveries: string[] = [];
    const runtime = await createPgliteRuntime({
      clock,
      learnerOtpDelivery: async ({ otp }) => {
        deliveries.push(otp);
      },
    });
    const world = await seedWorld(runtime, clock);

    await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/request-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "locked@example.com" },
    });
    await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/request-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "locked@example.com" },
    });
    expect(deliveries).toHaveLength(2);
    const wrongCode = deliveries[1] === "000000" ? "111111" : "000000";

    const oldCode = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/verify-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "locked@example.com", otp: deliveries[0] },
    });
    expect(oldCode.status).toBe(401);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const failed = await dispatch(runtime, {
        method: "POST",
        path: "/v1/learner/auth/verify-otp",
        headers: { "x-school-id": world.schoolA.publicId },
        body: { email: "locked@example.com", otp: wrongCode },
      });
      expect(failed.status).toBe(401);
    }
    const correctAfterLock = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/verify-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "locked@example.com", otp: deliveries[1] },
    });
    expect(correctAfterLock.status).toBe(401);
    await runtime.close();
  });

  it("does not allow an OTP from one school to authenticate in another", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const deliveries: string[] = [];
    const runtime = await createPgliteRuntime({
      clock,
      learnerOtpDelivery: async ({ otp }) => {
        deliveries.push(otp);
      },
    });
    const world = await seedWorld(runtime, clock);
    await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/request-otp",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "same@example.com" },
    });
    const wrongSchool = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/verify-otp",
      headers: { "x-school-id": world.schoolB.publicId },
      body: { email: "same@example.com", otp: deliveries[0] },
    });
    expect(wrongSchool.status).toBe(401);
    await runtime.close();
  });

  it("handles school login methods querying and updating", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // 1. Public endpoint
    const pubRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/school/login-methods",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(pubRes.status).toBe(200);
    expect(pubRes.body).toEqual({
      schoolId: world.schoolA.publicId,
      loginMethods: ["email"],
      hasSSO: false,
      hasGoogle: false,
    });

    // 2. Admin GET endpoint requires auth
    const unauthRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/login-methods",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(unauthRes.status).toBe(401);

    const adminGetRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
    });
    expect(adminGetRes.status).toBe(200);
    expect(adminGetRes.body).toMatchObject({
      loginMethods: ["email"],
      sso: {
        configured: false,
        entryPoint: "",
        cert: "",
        idpMetadata: "",
      },
      google: {
        configured: false,
        clientId: "",
        hasClientSecret: false,
      },
    });

    // 3. Validation: cannot enable SSO without config
    const enableSsoFail = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
      body: {
        loginMethods: ["email", "sso"],
      },
    });
    expect(enableSsoFail.status).toBe(400);

    // 4. Validation: cannot disable all login methods
    const disableAllFail = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
      body: {
        loginMethods: [],
      },
    });
    expect(disableAllFail.status).toBe(400);

    // 5. Configure SSO and Google
    const updateRes = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
      body: {
        sso: {
          idpMetadata: "<EntityDescriptor>...</EntityDescriptor>",
          entryPoint: "https://idp.example.com/saml/sso",
          cert: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0",
        },
        google: {
          clientId: "google-client-id-123",
          clientSecret: "google-client-secret-456",
        },
      },
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toMatchObject({
      loginMethods: ["email"],
      sso: {
        configured: true,
        entryPoint: "https://idp.example.com/saml/sso",
      },
      google: {
        configured: true,
        clientId: "google-client-id-123",
        hasClientSecret: true,
      },
    });

    // Verify sso_provider table has been populated
    const ssoProviders = await runtime.db.select().from(schema.ssoProvider);
    expect(ssoProviders.length).toBeGreaterThan(0);
    expect(ssoProviders[0]!.providerId).toBe("sso");

    // 6. Now enable all methods
    const enableAllRes = await dispatch(runtime, {
      method: "PATCH",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
      body: {
        loginMethods: ["email", "sso", "google"],
      },
    });
    expect(enableAllRes.status).toBe(200);
    expect(enableAllRes.body).toMatchObject({
      loginMethods: ["email", "sso", "google"],
    });

    // 7. Verify public endpoint reflects the changes
    const pubResUpdated = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/school/login-methods",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(pubResUpdated.status).toBe(200);
    expect(pubResUpdated.body).toEqual({
      schoolId: world.schoolA.publicId,
      loginMethods: ["email", "sso", "google"],
      hasSSO: true,
      hasGoogle: true,
    });

    await runtime.close();
  });

  it("authenticates a learner via Better Auth session cookie and auto-provisions learner", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Create a Better Auth user and session in database
    const userId = "ba-user-1";
    const sessionToken = "ba-session-token-xyz";
    await runtime.db.insert(schema.user).values({
      id: userId,
      name: "SSO Learner",
      email: "sso-learner@example.com",
      emailVerified: true,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.session).values({
      id: "ba-session-1",
      token: sessionToken,
      userId,
      expiresAt: new Date("2026-03-02T00:00:00.000Z"),
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    // Make an authenticated learner request with Better Auth cookie
    const whoami = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });
    expect(whoami.status).toBe(200);
    expect(whoami.body).toMatchObject({
      email: "sso-learner@example.com",
      name: "SSO Learner",
    });

    // Verify learner was persisted in database
    const learners = await runtime.db
      .select()
      .from(schema.learners)
      .where(
        and(
          eq(schema.learners.schoolId, world.schoolA.id),
          eq(schema.learners.email, "sso-learner@example.com"),
        ),
      );
    expect(learners).toHaveLength(1);
    expect(learners[0]!.name).toBe("SSO Learner");

    await runtime.close();
  });
});
