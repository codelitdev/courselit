import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("learner authentication", () => {
  it("does not expose the legacy learner OTP endpoints", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    for (const path of [
      "/v1/learner/auth/request-otp",
      "/v1/learner/auth/verify-otp",
    ]) {
      const response = await dispatch(runtime, {
        method: "POST",
        path,
        headers: { "x-school-id": world.schoolA.publicId },
        body: { email: "learner@example.com", otp: "000000" },
      });
      // Unknown learner routes fall through to the learner-auth guard, rather
      // than reaching a legacy unauthenticated OTP handler.
      expect(response.status).toBe(401);
    }

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

  it("authenticates a learner via the separate learner Better Auth realm", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const otp = await runtime.learnerAuth.auth.api.createVerificationOTP({
      body: {
        email: "sso-learner@example.com",
        type: "sign-in",
      },
    });
    // Obtain a real learner Better Auth browser session. Better Auth stores a
    // hashed session token, so inserting a raw token into the session table
    // would not represent a valid browser cookie.
    const signedIn = await runtime.learnerAuth.auth.api.signInEmailOTP({
      body: {
        email: "sso-learner@example.com",
        otp,
        name: "SSO Learner",
      },
      asResponse: true,
    });
    expect(signedIn.status).toBe(200);
    const sessionCookie = signedIn.headers.get("set-cookie")?.split(";", 1)[0];
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie).toMatch(/^courselit-learner\.session_token=/);

    // Make an authenticated learner request with Better Auth cookie
    const whoami = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: sessionCookie!,
      },
    });
    expect(whoami.status).toBe(200);
    expect(whoami.body).toMatchObject({
      email: "sso-learner@example.com",
      name: "SSO Learner",
    });

    // An admin Better Auth cookie is not a learner identity and must not be
    // bridged into the school-scoped learner session.
    const admin = await runtime.auth.auth.api.signUpEmail({
      body: {
        name: "Admin User",
        email: "admin@example.com",
        password: "password123",
      },
      asResponse: true,
    });
    const adminCookie = admin.headers.get("set-cookie")?.split(";", 1)[0];
    expect(adminCookie).toBeTruthy();
    expect(adminCookie).toMatch(/^courselit-admin\./);
    const adminWhoami = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: adminCookie!,
      },
    });
    expect(adminWhoami.status).toBe(401);

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
