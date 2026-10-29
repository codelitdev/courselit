import { describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("community invites", () => {
  it("invites someone onto a plan as an active member with the plan's products", async () => {
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
      body: { title: "Included course" },
    });
    const productId = (product.body as { id: string }).id;

    const [communityRow] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityId = communityRow!.publicId;
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
      body: {
        name: "Monthly membership",
        kind: "subscription",
        subscriptionMonthlyAmount: 12,
        amountMinor: 1200,
        includedProducts: [productId],
      },
    });
    expect(plan.status).toBe(201);
    const planId = (plan.body as { id: string }).id;
    const invite = (body: Record<string, unknown>) =>
      dispatch(runtime, {
        method: "POST",
        path: `/v1/communities/${communityId}/members`,
        headers: adminHeaders,
        body,
      });

    const offline = await invite({ email: "friend@example.com", planId });
    expect(offline.status).toBe(400);

    await runtime.db
      .update(schema.communities)
      .set({ enabled: true })
      .where(eq(schema.communities.id, communityRow!.id));

    const missingPlan = await invite({ email: "friend@example.com", planId: "pln_nope" });
    expect(missingPlan.status).toBe(404);

    const invited = await invite({
      email: "Friend@Example.com",
      name: "Friend",
      planId,
    });
    expect(invited.status).toBe(201);
    expect(invited.body).toMatchObject({
      status: "active",
      paymentPlanId: planId,
      member: { email: "friend@example.com" },
    });

    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, "friend@example.com"),
        ),
      );
    const memberships = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, account!.id));
    expect(memberships.filter((row) => row.entityType === "community")).toHaveLength(1);
    expect(
      memberships.filter(
        (row) =>
          row.entityType === "product" &&
          row.entityId === productId &&
          row.isIncludedInPlan &&
          row.status === "active",
      ),
    ).toHaveLength(1);

    // Inviting again keeps one membership.
    const again = await invite({ email: "friend@example.com", planId });
    expect(again.status).toBe(201);
    const communityRows = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(
        and(
          eq(schema.learnerMemberships.schoolAccountId, account!.id),
          eq(schema.learnerMemberships.entityType, "community"),
        ),
      );
    expect(communityRows).toHaveLength(1);
    await runtime.close();
  });
});
