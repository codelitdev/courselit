import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

describe.serial("approving a community join request", () => {
  it("gives the member the products bundled into their plan", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Bundled course" },
    });
    const productId = (product.body as { id: string }).id;
    await runtime.db
      .update(schema.products)
      .set({ status: "published", publishedAt: clock.now() })
      .where(eq(schema.products.publicId, productId));

    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityId = community!.publicId;
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community!.id));
    expect(
      await dispatch(runtime, {
        method: "PATCH",
        path: `/v1/communities/${communityId}`,
        headers: adminHeaders,
        body: { autoAcceptMembers: false },
      }),
    ).toMatchObject({ status: 200 });
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Founding member",
        kind: "free",
        type: "free",
        includedProducts: [productId],
      },
    });
    expect(plan.status).toBe(201);
    const planId = (plan.body as { id: string }).id;

    const email = "applicant@example.com";
    const signUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email,
        password: "learner-password-1",
        name: "Applicant",
      },
    });
    const learnerHeaders = {
      cookie: learnerCookie(signUp),
      "x-school-id": world.schoolA.publicId,
    };
    const request = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "approval-request" },
      body: { planId, joiningReason: "I draw tiny sprites" },
    });
    expect(request.status).toBe(201);

    const [account] = await runtime.db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, email),
        ),
      );
    const membershipRows = () =>
      runtime.db
        .select()
        .from(schema.learnerMemberships)
        .where(eq(schema.learnerMemberships.schoolAccountId, account!.id));
    const learnerProducts = async () =>
      (
        (
          await dispatch(runtime, {
            method: "GET",
            path: "/v1/learner/products",
            headers: learnerHeaders,
          })
        ).body as { items: Array<{ id: string }> }
      ).items.map((item) => item.id);

    // While the request is waiting the applicant has nothing.
    const waiting = (await membershipRows()).find((row) => row.entityType === "community");
    expect(waiting?.status).toBe("pending");
    expect((await membershipRows()).filter((row) => row.entityType === "product")).toHaveLength(0);
    expect(await learnerProducts()).toEqual([]);

    const approve = () =>
      dispatch(runtime, {
        method: "PATCH",
        path: `/v1/community-memberships/${waiting!.publicId}`,
        headers: adminHeaders,
        body: { status: "active" },
      });
    expect(await approve()).toMatchObject({ status: 200 });

    const granted = (await membershipRows()).filter(
      (row) => row.entityType === "product" && row.entityId === productId,
    );
    expect(granted).toHaveLength(1);
    expect(granted[0]).toMatchObject({
      status: "active",
      isIncludedInPlan: true,
      paymentPlanId: planId,
      parentMembershipId: waiting!.id,
    });
    expect(await learnerProducts()).toEqual([productId]);

    // Approving again changes nothing.
    expect(await approve()).toMatchObject({ status: 200 });
    expect(
      (await membershipRows()).filter((row) => row.entityType === "product"),
    ).toHaveLength(1);

    // Removing the member takes the bundle back, as it always has.
    expect(
      await dispatch(runtime, {
        method: "PATCH",
        path: `/v1/community-memberships/${waiting!.publicId}`,
        headers: adminHeaders,
        body: { status: "rejected", rejectionReason: "Not a fit" },
      }),
    ).toMatchObject({ status: 200 });
    expect(await learnerProducts()).toEqual([]);

    await runtime.close();
  });

  it("does not hand out the bundle when a request is rejected", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Bundled course" },
    });
    const productId = (product.body as { id: string }).id;
    await runtime.db
      .update(schema.products)
      .set({ status: "published", publishedAt: clock.now() })
      .where(eq(schema.products.publicId, productId));
    const [community] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityId = community!.publicId;
    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, community!.id));
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/communities/${communityId}`,
      headers: adminHeaders,
      body: { autoAcceptMembers: false },
    });
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId}/plans`,
      headers: adminHeaders,
      body: { name: "Founding member", kind: "free", type: "free", includedProducts: [productId] },
    });
    const planId = (plan.body as { id: string }).id;
    const signUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email: "rejected@example.com",
        password: "learner-password-1",
        name: "Rejected",
      },
    });
    const learnerHeaders = {
      cookie: learnerCookie(signUp),
      "x-school-id": world.schoolA.publicId,
    };
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...learnerHeaders, "idempotency-key": "reject-request" },
      body: { planId, joiningReason: "Please let me in" },
    });
    const [pending] = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.entityType, "community"),
          eq(schema.learnerMemberships.status, "pending"),
        ),
      );
    expect(
      await dispatch(runtime, {
        method: "PATCH",
        path: `/v1/community-memberships/${pending!.publicId}`,
        headers: adminHeaders,
        body: { status: "rejected", rejectionReason: "Not a fit" },
      }),
    ).toMatchObject({ status: 200 });
    const products = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.entityType, "product"));
    expect(products.filter((row) => row.entityId === productId)).toHaveLength(0);
    await runtime.close();
  });
});
