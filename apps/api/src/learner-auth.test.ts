import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("learner authentication", () => {
  it("does not expose legacy unauthenticated learner OTP endpoints", async () => {
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
      expect(response.status).toBe(401);
    }

    await runtime.close();
  });

  it("handles school login methods querying", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Public endpoint returns computed login methods from env vars
    const pubRes = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/login-methods`,
      headers: { host: "courselit-api:4000" },
    });
    expect(pubRes.status).toBe(200);
    expect(pubRes.body).toMatchObject({
      schoolId: world.schoolA.publicId,
      loginMethods: expect.arrayContaining(["email"]),
      hasGoogle: false,
    });

    // A school host does not stand in for the school id in the path.
    const hostRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/school/login-methods",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(hostRes.status).toBe(404);

    const unknownSchoolRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/sch_unknown/login-methods",
      headers: {},
    });
    expect(unknownSchoolRes.status).toBe(404);

    // Admin login-methods endpoint no longer exists, and routes outside the
    // contract are closed to every credential.
    const adminRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
    });
    expect(adminRes.status).toBe(403);

    await runtime.close();
  });

  it("authenticates a learner via unified Better Auth and bridges to school account", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const email = "unified-learner@example.com";
    const otp = await runtime.auth.auth.api.createVerificationOTP({
      body: {
        email,
        type: "sign-in",
      },
    });
    const signedIn = await runtime.auth.auth.api.signInEmailOTP({
      body: {
        email,
        otp,
        name: "Unified Learner",
      },
      asResponse: true,
    });
    expect(signedIn.status).toBe(200);
    const sessionCookie = signedIn.headers.get("set-cookie")?.split(";", 1)[0];
    expect(sessionCookie).toBeTruthy();

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
      email,
      name: "Unified Learner",
    });

    // Verify school account was persisted in database
    const accounts = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, email),
        ),
      );
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.displayName).toBe("Unified Learner");

    await runtime.close();
  });

  it("exchanges a single-use auth ticket for a school session", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-03T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    // Create a global user
    const userRes = await runtime.auth.auth.api.signUpEmail({
      body: {
        name: "Ticket User",
        email: "ticket-user@example.com",
        password: "password123",
      },
    });
    expect(userRes.user).toBeDefined();

    // Bridge user to school account
    const { signInLearnerWithIdentity, createSchoolAuthTicket } = await import("./learners.js");
    const bridged = await signInLearnerWithIdentity(runtime.db, {
      userId: userRes.user.id,
      email: userRes.user.email,
      name: userRes.user.name,
      schoolPublicId: world.schoolA.publicId,
      authenticationMethod: "email",
    }, clock, "test-req");
    expect(bridged.ok).toBe(true);
    if (!bridged.ok) return;

    // Create a school auth ticket
    const ticket = await createSchoolAuthTicket(runtime.db, {
      schoolId: world.schoolA.id,
      schoolAccountId: bridged.session.schoolAccount.id,
      userId: userRes.user.id,
      clock,
      authenticationMethod: "email",
    });

    // Exchange ticket on the tenant domain
    const exchange = await dispatch(runtime, {
      method: "POST",
      path: "/v1/auth/tickets/consume",
      headers: {
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        ticket,
      },
    });
    expect(exchange.status).toBe(200);
    expect(exchange.body).toMatchObject({
      email: "ticket-user@example.com",
      name: "Ticket User",
    });
    const sessionCookie = exchange.headers?.["Set-Cookie"];
    expect(sessionCookie).toBeTruthy();

    // Ticket cannot be reused
    const reuse = await dispatch(runtime, {
      method: "POST",
      path: "/v1/auth/tickets/consume",
      headers: {
        "x-school-id": world.schoolA.publicId,
      },
      body: {
        ticket,
      },
    });
    expect(reuse.status).toBe(401);

    await runtime.close();
  });

  it("bridges an admin session only into the school named by x-school-id", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const email = "host-learner@example.com";
    const otp = await runtime.auth.auth.api.createVerificationOTP({
      body: {
        email,
        type: "sign-in",
      },
    });
    const signedIn = await runtime.auth.auth.api.signInEmailOTP({
      body: {
        email,
        otp,
        name: "Host Learner",
      },
      asResponse: true,
    });
    expect(signedIn.status).toBe(200);
    const sessionCookie = signedIn.headers.get("set-cookie")?.split(";", 1)[0];
    expect(sessionCookie).toBeTruthy();

    // The request host never selects a school, even a school's own host.
    const hostOnly = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        host: "school-a.localhost:3001",
        "x-forwarded-host": "school-a.localhost:3001",
        cookie: sessionCookie!,
      },
    });
    expect(hostOnly.status).not.toBe(200);
    expect(hostOnly.body).toMatchObject({ code: "tenant_required" });

    // 1. The storefront server names the school; the admin session bridges.
    const whoami = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        host: "courselit-api:4000",
        "x-school-id": world.schoolA.publicId,
        cookie: sessionCookie!,
      },
    });
    expect(whoami.status).toBe(200);
    expect(whoami.body).toMatchObject({
      email,
      name: "Host Learner",
    });

    // Verify Set-Cookie header contains courselit.learner.session
    const courselitCookie = whoami.headers?.["Set-Cookie"];
    expect(courselitCookie).toContain("courselit.learner.session=");

    // Extract the courselit.learner.session cookie value
    const match = /courselit\.learner\.session=([^;]+)/.exec(courselitCookie as string);
    expect(match).toBeTruthy();
    const learnerCookieValue = match![1];

    // 2. The learner session pins its school; no header is needed.
    const whoamiWithSession = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        host: "courselit-api:4000",
        cookie: `courselit.learner.session=${learnerCookieValue}`,
      },
    });
    expect(whoamiWithSession.status).toBe(200);
    expect(whoamiWithSession.body).toMatchObject({
      email,
      name: "Host Learner",
    });

    // 3. A conflicting school header is rejected rather than switching tenants.
    const otherSchool = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        "x-school-id": world.schoolB.publicId,
        cookie: `courselit.learner.session=${learnerCookieValue}`,
      },
    });
    expect(otherSchool.status).toBe(403);
    expect(otherSchool.body).toMatchObject({ code: "tenant_forbidden" });

    await runtime.close();
  });

  it("requires an explicit school id to sign learners up and in", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const credentials = {
      email: "explicit-school@example.com",
      password: "correct horse battery",
    };

    for (const path of ["/v1/learner/auth/sign-up", "/v1/learner/auth/sign-in"]) {
      // A school host (or a school id header) does not substitute for the body.
      const missing = await dispatch(runtime, {
        method: "POST",
        path,
        headers: {
          host: "school-a.localhost:3001",
          "x-school-id": world.schoolA.publicId,
        },
        body: { ...credentials, name: "Explicit School" },
      });
      expect(missing.status).toBe(400);
      expect(missing.body).toMatchObject({ code: "validation_failed" });
    }

    const signUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { host: "school-b.localhost:3001" },
      body: { ...credentials, name: "Explicit School", schoolId: world.schoolA.publicId },
    });
    expect(signUp.status).toBe(201);
    expect(signUp.body).toMatchObject({ schoolId: world.schoolA.publicId });

    const signIn = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-in",
      headers: {},
      body: { ...credentials, schoolId: world.schoolA.publicId },
    });
    expect(signIn.status).toBe(200);

    // Subdomains are not school ids.
    const bySubdomain = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-in",
      headers: {},
      body: { ...credentials, schoolId: "school-a" },
    });
    expect(bySubdomain.status).toBe(401);

    await runtime.close();
  });
});
