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
      path: "/v1/public/school/login-methods",
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(pubRes.status).toBe(200);
    expect(pubRes.body).toMatchObject({
      schoolId: world.schoolA.publicId,
      loginMethods: expect.arrayContaining(["email"]),
      hasGoogle: false,
    });

    // Admin login-methods endpoint no longer exists
    const adminRes = await dispatch(runtime, {
      method: "GET",
      path: "/v1/school/login-methods",
      headers: {
        "x-school-id": world.schoolA.publicId,
        cookie: world.owner.sessionCookie,
      },
    });
    expect(adminRes.status).toBe(404);

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
});
