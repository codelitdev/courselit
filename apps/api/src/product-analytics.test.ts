import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("product analytics", () => {
  it("returns the school-scoped dashboard read model with a complete date series", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const response = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/analytics?range=7d`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      productId: world.noteA.publicId,
      range: "7d",
      currency: "USD",
      sales: {
        amountMinor: 0,
        growth: 0,
      },
      customers: { count: 0, growth: 0 },
      completions: { count: 0, growth: 0 },
      downloads: { count: 0, growth: 0 },
    });
    const body = response.body as {
      sales: { points: Array<{ date: string; amountMinor: number }> };
    };
    expect(body.sales.points).toHaveLength(7);
    expect(body.sales.points[0]).toEqual({ date: "2026-02-27", amountMinor: 0 });
    expect(body.sales.points[6]).toEqual({ date: "2026-03-05", amountMinor: 0 });

    const longerRange = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/analytics?range=30d`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(longerRange.status).toBe(200);
    expect(
      (longerRange.body as { sales: { points: unknown[] } }).sales.points,
    ).toHaveLength(30);

    const yearRange = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/analytics?range=1y`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(yearRange.status).toBe(200);
    expect(
      (yearRange.body as { sales: { points: unknown[] } }).sales.points,
    ).toHaveLength(366);

    await runtime.close();
  });

  it("keeps analytics tenant-scoped and validates the requested range", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const wrongSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/analytics`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolB.publicId,
      },
    });
    expect(wrongSchool.status).toBe(404);

    const invalidRange = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}/analytics?range=2d`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(invalidRange.status).toBe(400);

    await runtime.close();
  });

  it("aggregates payments, customers, and completed course progress", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T15:30:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);
    const now = clock.now();
    const eventDate = new Date("2026-03-04T10:00:00.000Z");
    const product = (
      await runtime.db
        .select({ id: schema.products.id })
        .from(schema.products)
        .where(eq(schema.products.publicId, world.noteA.publicId))
        .limit(1)
    )[0]!;
    const learnerId = uuidv7(clock);
    const sectionId = uuidv7(clock);
    const lessonId = uuidv7(clock);
    const enrollmentId = uuidv7(clock);
    const planId = uuidv7(clock);
    const checkoutId = uuidv7(clock);

    await runtime.db.insert(schema.learners).values({
      id: learnerId,
      publicId: createPublicId("lrn", clock),
      schoolId: world.schoolA.id,
      email: "learner@example.com",
      name: "Learner",
      status: "active",
      createdAt: eventDate,
      updatedAt: eventDate,
    });
    await runtime.db.insert(schema.productSections).values({
      id: sectionId,
      publicId: createPublicId("sec", clock),
      schoolId: world.schoolA.id,
      productId: product.id,
      title: "First section",
      position: 1,
      createdBy: world.owner.id,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db.insert(schema.lessons).values({
      id: lessonId,
      publicId: createPublicId("les", clock),
      schoolId: world.schoolA.id,
      productId: product.id,
      sectionId,
      title: "First lesson",
      type: "text",
      content: { type: "doc", content: [] },
      requiresEnrollment: true,
      status: "published",
      position: 1,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db.insert(schema.enrollments).values({
      id: enrollmentId,
      publicId: createPublicId("enr", clock),
      schoolId: world.schoolA.id,
      learnerId,
      productId: product.id,
      source: "storefront_purchase",
      status: "active",
      createdAt: eventDate,
    });
    await runtime.db.insert(schema.lessonProgress).values({
      id: uuidv7(clock),
      schoolId: world.schoolA.id,
      enrollmentId,
      lessonId,
      startedAt: eventDate,
      completedAt: eventDate,
      createdAt: eventDate,
    });
    await runtime.db.insert(schema.storefrontPlans).values({
      id: planId,
      publicId: createPublicId("pln", clock),
      schoolId: world.schoolA.id,
      productId: product.id,
      name: "Paid access",
      description: "",
      includedProducts: [],
      providerProductId: "pdt_test",
      kind: "one_time",
      amountMinor: 1250,
      billingInterval: null,
      installmentCount: null,
      status: "active",
      isDefault: true,
      createdBy: world.owner.id,
      createdAt: now,
      updatedAt: now,
    });
    await runtime.db.insert(schema.storefrontCheckoutAttempts).values({
      id: checkoutId,
      publicId: createPublicId("chk", clock),
      schoolId: world.schoolA.id,
      learnerId,
      productId: product.id,
      planId,
      provider: "stripe",
      idempotencyKey: "analytics-fixture",
      providerCheckoutId: "checkout_analytics",
      providerCheckoutUrl: null,
      status: "paid",
      currency: "USD",
      amountMinor: 1250,
      createdAt: eventDate,
      updatedAt: eventDate,
      completedAt: eventDate,
    });
    await runtime.db.insert(schema.storefrontPayments).values({
      id: uuidv7(clock),
      publicId: createPublicId("pay", clock),
      checkoutId,
      providerPaymentId: "payment_analytics",
      kind: "one_time",
      status: "succeeded",
      currency: "USD",
      amountMinor: 1250,
      occurredAt: eventDate,
      createdAt: eventDate,
      updatedAt: eventDate,
    });

    await runtime.db
      .update(schema.schools)
      .set({ currency: "INR" })
      .where(eq(schema.schools.id, world.schoolA.id));
    const response = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products/" + world.noteA.publicId + "/analytics?range=7d",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      currency: "INR",
      sales: { amountMinor: 1250, growth: 100 },
      customers: { count: 1, growth: 100 },
      completions: { count: 1, growth: 100 },
    });
    expect(
      (response.body as { sales: { points: Array<{ date: string; amountMinor: number }> } })
        .sales.points.find((point) => point.date === "2026-03-04"),
    ).toEqual({ date: "2026-03-04", amountMinor: 1250 });

    await runtime.close();
  });
});
