import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("admin learner management", () => {
  it("ports product customer invitations as an admin enrollment grant", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { kind: "course", title: "Invite course", slug: "invite-course" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    expect(published.status).toBe(200);

    const invited = await dispatch(runtime, {
      method: "POST",
      path: "/v1/memberships",
      headers: adminHeaders,
      body: {
        productId,
        email: "invited-learner@example.com",
        name: "Invited Learner",
      },
    });
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({
      entityType: "product",
      entityId: productId,
      schoolId: world.schoolA.publicId,
      status: "active",
      isIncludedInPlan: false,
    });
    const learner = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "invited-learner@example.com"));
    expect(learner).toHaveLength(1);
    expect(learner[0]).toMatchObject({
      displayName: "Invited Learner",
      schoolId: world.schoolA.id,
      status: "active",
    });
    await runtime.close();
  });

  it("lists a school roster and suspending a learner invalidates sessions", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "roster-learner@example.com",
        password: "learner-password-1",
        name: "Roster Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"];
    expect(learnerCookie).toBeString();

    const roster = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learners?limit=10",
      headers: adminHeaders,
    });
    expect(roster.status).toBe(200);
    const item = (roster.body as { items: Array<{ id: string; email: string; name: string; status: string }> }).items.find(
      (it) => it.email === "roster-learner@example.com",
    );
    expect(item).toBeDefined();
    expect(item).toMatchObject({
      email: "roster-learner@example.com",
      name: "Roster Learner",
      status: "active",
    });
    const learnerId = item!.id;

    const invalidCursor = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learners?cursor=not-a-cursor",
      headers: adminHeaders,
    });
    expect(invalidCursor.status).toBe(400);
    expect(invalidCursor.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "invalid_cursor" },
    });

    const suspended = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learners/${learnerId}`,
      headers: { ...adminHeaders, "x-request-id": "req_learner_suspend" },
      body: { status: "deactivated" },
    });
    expect(suspended.status).toBe(200);
    expect(suspended.body).toMatchObject({ id: learnerId, status: "deactivated" });

    const invalidated = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        cookie: learnerCookie as string,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(invalidated.status).toBe(401);

    const restored = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learners/${learnerId}`,
      headers: adminHeaders,
      body: { status: "active" },
    });
    expect(restored.status).toBe(200);
    const signedIn = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-in",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "roster-learner@example.com",
        password: "learner-password-1",
      },
    });
    expect(signedIn.status).toBe(200);

    const events = await runtime.db
      .select({
        action: schema.auditEvents.action,
        requestId: schema.auditEvents.requestId,
      })
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.resourceId, learnerId));
    expect(events).toEqual(
      expect.arrayContaining([
        { action: "learner.deactivated", requestId: "req_learner_suspend" },
        { action: "learner.restored", requestId: expect.any(String) },
      ]),
    );
    await runtime.close();
  });

  it("re-establishes a learner session after reactivation with a stale session cookie", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const email = "reactivation-learner@example.com";

    const otp = await runtime.auth.auth.api.createVerificationOTP({
      body: { email, type: "sign-in" },
    });
    const betterAuthSignIn = await runtime.auth.auth.api.signInEmailOTP({
      body: { email, otp, name: "Reactivation Learner" },
      asResponse: true,
    });
    expect(betterAuthSignIn.status).toBe(200);
    const betterAuthCookie = betterAuthSignIn.headers
      .get("set-cookie")
      ?.split(";", 1)[0];
    expect(betterAuthCookie).toBeTruthy();

    const firstMe = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        cookie: betterAuthCookie!,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(firstMe.status).toBe(200);
    const learnerCookie = firstMe.headers?.["Set-Cookie"]?.split(";", 1)[0];
    expect(learnerCookie).toBeTruthy();

    const roster = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learners?limit=50",
      headers: adminHeaders,
    });
    const learnerId = (
      roster.body as { items: Array<{ id: string; email: string }> }
    ).items.find((item) => item.email === email)?.id;
    expect(learnerId).toBeTruthy();

    const learnerCookies = `${learnerCookie}; ${betterAuthCookie}`;
    const deactivated = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learners/${learnerId}`,
      headers: adminHeaders,
      body: { status: "deactivated" },
    });
    expect(deactivated.status).toBe(200);

    const blocked = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        cookie: learnerCookies,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(blocked.status).toBe(401);

    const reactivated = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/learners/${learnerId}`,
      headers: adminHeaders,
      body: { status: "active" },
    });
    expect(reactivated.status).toBe(200);

    const restoredMe = await dispatch(runtime, {
      method: "GET",
      path: "/v1/learner/me",
      headers: {
        cookie: learnerCookies,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(restoredMe.status).toBe(200);
    expect(restoredMe.body).toMatchObject({ email });

    await runtime.close();
  });

  it("links staff and learner identities through unified school accounts", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const now = clock.now();
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.userId, world.owner.id),
        ),
      );
    const ownerAccountId = account!.id;
    const [communityRow] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityId = communityRow!.id;
    const communityPublicId = communityRow!.publicId;
    await runtime.db.insert(schema.communityMemberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("cmm", clock),
      schoolId: world.schoolA.id,
      communityId,
      paymentPlanId: null,
      schoolAccountId: ownerAccountId,
      status: "active",
      role: "owner",
      joiningReason: "",
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });

    // The owner's account already exists in schoolAccounts
    const accounts = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        eq(schema.schoolAccounts.id, ownerAccountId),
      );
    expect(accounts).toHaveLength(1);
    expect(accounts[0]!.email).toBe(world.owner.email);

    // Calling identity-link returns a valid token for backward-compatibility
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const link = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learners/identity-link",
      headers: adminHeaders,
      body: {},
    });
    expect(link.status).toBe(201);

    await runtime.close();
  });
});
