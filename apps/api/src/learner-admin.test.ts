import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
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
      .from(schema.learners)
      .where(eq(schema.learners.email, "invited-learner@example.com"));
    expect(learner).toHaveLength(1);
    expect(learner[0]).toMatchObject({
      name: "Invited Learner",
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
      path: "/v1/learners?limit=1",
      headers: adminHeaders,
    });
    expect(roster.status).toBe(200);
    expect(roster.body).toMatchObject({
      items: [
        {
          email: "roster-learner@example.com",
          name: "Roster Learner",
          schoolId: world.schoolA.publicId,
          status: "active",
          createdAt: "2026-03-04T00:00:00.000Z",
        },
      ],
      nextCursor: null,
    });
    const learnerId = (roster.body as { items: Array<{ id: string }> }).items[0]!.id;

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

  it("links an explicitly claimed learner identity to admin-owned community membership", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-04T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const now = clock.now();
    const communityId = uuidv7(clock);
    const communityPublicId = createPublicId("com", clock);
    await runtime.db.insert(schema.communities).values({
      id: communityId,
      publicId: communityPublicId,
      schoolId: world.schoolA.id,
      name: "Owners community",
      slug: "owners-community",
      description: "",
      banner: "",
      categories: '["General"]',
      enabled: true,
      autoAcceptMembers: true,
      joiningReasonText: "",
      deletedAt: null,
      createdBy: world.owner.id,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db.insert(schema.communityMemberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("cmm", clock),
      schoolId: world.schoolA.id,
      communityId,
      paymentPlanId: null,
      learnerId: null,
      adminUserId: world.owner.id,
      status: "active",
      role: "owner",
      joiningReason: "",
      rejectionReason: null,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db.insert(schema.storefrontPlans).values({
      id: uuidv7(clock),
      publicId: createPublicId("cpp", clock),
      schoolId: world.schoolA.id,
      entityType: "community",
      entityId: communityPublicId,
      name: "Free",
      description: "",
      includedProducts: [],
      providerProductId: null,
      kind: "free",
      oneTimeAmount: null,
      emiAmount: null,
      emiTotalInstallments: null,
      subscriptionMonthlyAmount: null,
      subscriptionYearlyAmount: null,
      amountMinor: 0,
      billingInterval: null,
      installmentCount: null,
      status: "active",
      isDefault: true,
      createdBy: world.owner.id,
      createdAt: now,
      updatedAt: now,
    });

    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const sameEmailLogin = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: world.owner.email,
        password: "learner-password-1",
        name: "Email Match Only",
      },
    });
    expect(sameEmailLogin.status).toBe(201);
    expect(
      await runtime.db
        .select()
        .from(schema.learnerAdminLinks)
        .where(eq(schema.learnerAdminLinks.schoolId, world.schoolA.id)),
    ).toHaveLength(0);

    const link = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learners/identity-link",
      headers: adminHeaders,
      body: {},
    });
    expect(link.status).toBe(201);
    const linkToken = (link.body as { token: string }).token;

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "owner-as-learner@example.com",
        password: "learner-password-1",
        name: "Owner Learner",
        identityLinkToken: linkToken,
      },
    });
    expect(signedUp.status).toBe(201);
    const learnerCookie = signedUp.headers?.["Set-Cookie"];
    expect(learnerCookie).toBeString();

    const learner = await runtime.db
      .select()
      .from(schema.learners)
      .where(eq(schema.learners.email, "owner-as-learner@example.com"));
    expect(learner).toHaveLength(1);
    const memberships = await runtime.db
      .select()
      .from(schema.communityMemberships)
      .where(eq(schema.communityMemberships.communityId, communityId));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      learnerId: learner[0]!.id,
      adminUserId: world.owner.id,
      role: "owner",
    });

    const joined = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityPublicId}/join`,
      headers: {
        cookie: learnerCookie as string,
        "x-school-id": world.schoolA.publicId,
      },
      body: { joiningReason: "" },
    });
    expect(joined.status).toBe(200);
    const left = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityPublicId}/leave`,
      headers: {
        cookie: learnerCookie as string,
        "x-school-id": world.schoolA.publicId,
      },
      body: {},
    });
    expect(left.status).toBe(409);
    expect(left.body).toMatchObject({
      details: { reason: "cannot_leave_linked_admin_membership" },
    });
    const membershipsAfterJoin = await runtime.db
      .select()
      .from(schema.communityMemberships)
      .where(eq(schema.communityMemberships.communityId, communityId));
    expect(membershipsAfterJoin).toHaveLength(1);
    await runtime.close();
  });
});
