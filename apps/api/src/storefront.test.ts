import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("storefront plans", () => {
  it("supports plan shapes, one default, updates, and source archive rules", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };

    const free = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Free access",
        kind: "free",
        amountMinor: 0,
      },
    });
    expect(free.status).toBe(201);
    expect(free.body).toMatchObject({
      name: "Free access",
      type: "free",
      kind: "free",
      currency: "USD",
      oneTimeAmount: null,
      emiAmount: null,
      emiTotalInstallments: null,
      subscriptionMonthlyAmount: null,
      subscriptionYearlyAmount: null,
      amountMinor: 0,
      billingInterval: null,
      installmentCount: null,
      isDefault: true,
      status: "active",
    });
    const freeId = (free.body as { id: string }).id;

    const oneTime = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "One-time access",
        type: "onetime",
        oneTimeAmount: 49.5,
      },
    });
    expect(oneTime.status).toBe(201);
    const oneTimeId = (oneTime.body as { id: string }).id;
    expect(oneTime.body).toMatchObject({
      type: "onetime",
      kind: "one_time",
      oneTimeAmount: 49.5,
      amountMinor: 4950,
      billingInterval: null,
    });

    await runtime.db
      .update(schema.schools)
      .set({ currency: "INR" })
      .where(eq(schema.schools.id, world.schoolA.id));

    const currencyOnPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Plan with its own currency",
        type: "onetime",
        oneTimeAmount: 30,
        currency: "EUR",
      },
    });
    expect(currencyOnPlan.status).toBe(400);

    const installment = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Three monthly payments",
        description: "Pay over three months.",
        kind: "installment",
        amountMinor: 3000,
        billingInterval: "month",
        installmentCount: 3,
      },
    });
    expect(installment.status).toBe(201);
    const installmentId = (installment.body as { id: string }).id;
    expect(installment.body).toMatchObject({
      isDefault: false,
      description: "Pay over three months.",
      includedProducts: [],
      type: "emi",
      emiAmount: 30,
      emiTotalInstallments: 3,
      currency: "INR",
    });
    const storedPlans = await runtime.db
      .select()
      .from(schema.storefrontPlans)
      .where(eq(schema.storefrontPlans.schoolId, world.schoolA.id));
    expect(storedPlans[1]).not.toHaveProperty("currency");

    const subscription = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Monthly subscription",
        type: "subscription",
        subscriptionMonthlyAmount: 12.5,
        subscriptionYearlyAmount: null,
      },
    });
    expect(subscription.status).toBe(201);
    const subscriptionId = (subscription.body as { id: string }).id;
    expect(subscription.body).toMatchObject({
      type: "subscription",
      kind: "subscription",
      subscriptionMonthlyAmount: 12.5,
      subscriptionYearlyAmount: null,
      amountMinor: 1250,
      billingInterval: "month",
    });

    const yearlySubscription = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        // Source behavior allows the same display name for another plan type.
        name: "One-time access",
        type: "subscription",
        subscriptionYearlyAmount: 100,
      },
    });
    expect(yearlySubscription.status).toBe(201);
    expect(yearlySubscription.body).toMatchObject({
      type: "subscription",
      subscriptionMonthlyAmount: null,
      subscriptionYearlyAmount: 100,
      billingInterval: "year",
    });

    const duplicateMonthly = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Another monthly plan",
        type: "subscription",
        subscriptionMonthlyAmount: 20,
      },
    });
    expect(duplicateMonthly.status).toBe(409);
    expect(duplicateMonthly.body).toMatchObject({
      code: "conflict",
      details: { reason: "duplicate_payment_plan" },
    });

    const duplicateType = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Another one-time plan",
        type: "onetime",
        oneTimeAmount: 99,
      },
    });
    expect(duplicateType.status).toBe(409);
    expect(duplicateType.body).toMatchObject({
      code: "conflict",
      details: { reason: "duplicate_payment_plan" },
    });

    const includedProducts = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Product bundle",
        type: "free",
        includedProducts: ["another-product"],
      },
    });
    expect(includedProducts.status).toBe(400);
    expect(includedProducts.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "included_products_not_allowed" },
    });

    const bothSubscriptionAmounts = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Ambiguous subscription",
        type: "subscription",
        subscriptionMonthlyAmount: 12.5,
        subscriptionYearlyAmount: 100,
      },
    });
    expect(bothSubscriptionAmounts.status).toBe(400);
    expect(bothSubscriptionAmounts.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "invalid_plan_shape" },
    });

    const invalid = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
      body: {
        name: "Broken subscription",
        kind: "subscription",
        amountMinor: 1000,
      },
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "invalid_plan_shape" },
    });

    const selected = await dispatch(runtime, {
      method: "POST",
      path: `/v1/plans/${installmentId}/default`,
      headers,
      body: {},
    });
    expect(selected.status).toBe(200);
    expect(selected.body).toMatchObject({ id: installmentId, isDefault: true });

    const renamed = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/plans/${installmentId}`,
      headers,
      body: {
        name: "Three payments",
        description: "Flexible monthly access.",
        type: "emi",
        kind: "installment",
        emiAmount: 45,
        emiTotalInstallments: 3,
      },
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({
      id: installmentId,
      name: "Three payments",
      description: "Flexible monthly access.",
      kind: "installment",
      type: "emi",
      emiAmount: 45,
      emiTotalInstallments: 3,
      amountMinor: 4500,
      billingInterval: "month",
      installmentCount: 3,
    });

    const defaultArchive = await dispatch(runtime, {
      method: "POST",
      path: `/v1/plans/${installmentId}/archive`,
      headers,
      body: {},
    });
    expect(defaultArchive.status).toBe(409);
    expect(defaultArchive.body).toMatchObject({
      code: "conflict",
      details: { reason: "default_plan_cannot_be_archived" },
    });

    const archived = await dispatch(runtime, {
      method: "POST",
      path: `/v1/plans/${oneTimeId}/archive`,
      headers,
      body: {},
    });
    expect(archived.status).toBe(200);
    expect(archived.body).toMatchObject({
      id: oneTimeId,
      status: "archived",
      isDefault: false,
    });

    const listed = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers,
    });
    expect(listed.status).toBe(200);
    expect((listed.body as { items: unknown[] }).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: freeId,
          isDefault: false,
          status: "active",
          currency: "INR",
        }),
        expect.objectContaining({ id: oneTimeId, status: "archived", type: "onetime" }),
        expect.objectContaining({
          id: subscriptionId,
          status: "active",
          type: "subscription",
        }),
        expect.objectContaining({
          id: installmentId,
          isDefault: true,
          status: "active",
        }),
      ]),
    );

    const crossSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers: { ...headers, "x-school-id": world.schoolB.publicId },
    });
    expect(crossSchool.status).toBe(404);
    await runtime.close();
  });
});
