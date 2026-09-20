import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("community payment plans", () => {
  it("allows multiple community payment plans of the same kind unlocking different perks", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const communities = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const community = communities[0]!;

    // 1. Create first free plan
    const freePlan1 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "Basic Member",
        description: "General discussion access",
        kind: "free",
        type: "free",
        amountMinor: 0,
      },
    });
    expect(freePlan1.status).toBe(201);
    expect((freePlan1.body as { isDefault: boolean }).isDefault).toBe(true);

    // 2. Create second free plan (different perks/description)
    const freePlan2 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "Partner Member",
        description: "Special partner free access",
        kind: "free",
        type: "free",
        amountMinor: 0,
      },
    });
    expect(freePlan2.status).toBe(201);
    expect((freePlan2.body as { isDefault: boolean }).isDefault).toBe(false);

    // 3. Create multiple one-time plans (e.g. standard lifetime vs VIP lifetime)
    const oneTimePlan1 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "Lifetime Access",
        description: "Standard lifetime membership",
        kind: "one_time",
        type: "onetime",
        oneTimeAmount: 100,
        amountMinor: 10000,
      },
    });
    expect(oneTimePlan1.status).toBe(201);

    const oneTimePlan2 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "VIP Lifetime Access",
        description: "VIP lifetime membership with included courses",
        kind: "one_time",
        type: "onetime",
        oneTimeAmount: 250,
        amountMinor: 25000,
        includedProducts: [world.noteA.publicId],
      },
    });
    expect(oneTimePlan2.status).toBe(201);

    // 4. Create multiple subscription plans with same billing interval (e.g. $10/mo vs $30/mo tiers)
    const subMonthlyTier1 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "Silver Supporter",
        description: "Access to silver spaces",
        kind: "subscription",
        type: "subscription",
        billingInterval: "month",
        subscriptionMonthlyAmount: 10,
        amountMinor: 1000,
      },
    });
    expect(subMonthlyTier1.status).toBe(201);

    const subMonthlyTier2 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
      body: {
        name: "Gold Supporter",
        description: "Access to all spaces and premium perks",
        kind: "subscription",
        type: "subscription",
        billingInterval: "month",
        subscriptionMonthlyAmount: 30,
        amountMinor: 3000,
        includedProducts: [world.noteA.publicId],
      },
    });
    expect(subMonthlyTier2.status).toBe(201);

    // 5. Update existing plan to same kind without conflict
    const plan2Id = (oneTimePlan2.body as { id: string }).id;
    const updatedPlan2 = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/community-plans/${plan2Id}`,
      headers,
      body: {
        name: "VIP Lifetime Access Plus",
        oneTimeAmount: 300,
        amountMinor: 30000,
      },
    });
    expect(updatedPlan2.status).toBe(200);
    expect((updatedPlan2.body as { name: string }).name).toBe("VIP Lifetime Access Plus");

    // 6. Verify listing returns all active community plans
    const listRes = await dispatch(runtime, {
      method: "GET",
      path: `/v1/communities/${community.publicId}/plans`,
      headers,
    });
    expect(listRes.status).toBe(200);
    const items = (listRes.body as { items: Array<{ name: string; kind: string }> }).items;
    expect(items).toHaveLength(6);

    // 7. Verify product plans still enforce single active plan per kind
    const productPlan1 = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Note One Time 1",
        kind: "one_time",
        type: "onetime",
        oneTimeAmount: 10,
        amountMinor: 1000,
      },
    });
    expect(productPlan1.status).toBe(201);

    const productPlan2Duplicate = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Note One Time 2",
        kind: "one_time",
        type: "onetime",
        oneTimeAmount: 20,
        amountMinor: 2000,
      },
    });
    expect(productPlan2Duplicate.status).toBe(409);
    expect(productPlan2Duplicate.body).toMatchObject({
      code: "conflict",
      details: { reason: "duplicate_payment_plan" },
    });

    await runtime.close();
  });
});
