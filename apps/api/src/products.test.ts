import { describe, expect, it } from "bun:test";
import { createPublicId, uuidv7 } from "@codelitdev/platform";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";

describe.serial("product listing", () => {
  it("requires an active payment plan before publishing", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);
    const headers = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "course", title: "Plan required" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;

    const withoutPlan = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { status: "published" },
    });
    expect(withoutPlan.status).toBe(400);
    expect(withoutPlan.body).toMatchObject({
      code: "validation_failed",
      details: { reason: "payment_plan_required" },
    });

    const freePlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers,
      body: { name: "Free access", kind: "free" },
    });
    expect(freePlan.status).toBe(201);

    const withPlan = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { status: "published" },
    });
    expect(withPlan.status).toBe(200);
    expect(withPlan.body).toMatchObject({ id: productId, status: "published" });

    await runtime.close();
  });

  it("ports product card metrics, kind filtering, and cursor pagination", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock });
    const world = await seedWorld(runtime, clock);

    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "download", title: "Second product", description: "" },
    });
    expect(created.status).toBe(201);

    const seededProduct = await runtime.db
      .select()
      .from(schema.products)
      .where(
        and(
          eq(schema.products.schoolId, world.schoolA.id),
          eq(schema.products.publicId, world.noteA.publicId),
        ),
      )
      .limit(1);
    const learnerId = uuidv7(clock);
    const userId = uuidv7(clock);
    await runtime.db.insert(schema.user).values({
      id: userId,
      email: "learner@example.com",
      name: "Learner",
      emailVerified: true,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.schoolAccounts).values({
      id: learnerId,
      publicId: createPublicId("sca", clock),
      schoolId: world.schoolA.id,
      userId,
      email: "learner@example.com",
      displayName: "Learner",
      status: "active",
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });
    await runtime.db.insert(schema.learnerMemberships).values({
      id: uuidv7(clock),
      publicId: createPublicId("lrm", clock),
      schoolId: world.schoolA.id,
      schoolAccountId: learnerId,
      entityType: "product",
      entityId: world.noteA.publicId,
      paymentPlanId: null,
      status: "active",
      role: null,
      subscriptionId: null,
      subscriptionMethod: null,
      joiningReason: "",
      rejectionReason: null,
      sessionId: null,
      isIncludedInPlan: false,
      parentMembershipId: null,
      createdAt: clock.now(),
      updatedAt: clock.now(),
    });

    const firstPage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products?limit=1",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(firstPage.status).toBe(200);
    const firstBody = firstPage.body as {
      items: Array<{
        id: string;
        currency: string;
        sales: number;
        customers: number;
      }>;
      nextCursor: string | null;
    };
    expect(firstBody.items).toHaveLength(1);
    expect(firstBody.nextCursor).toBeString();

    const secondPage = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products?limit=1&cursor=${encodeURIComponent(firstBody.nextCursor!)}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(secondPage.status).toBe(200);
    const secondBody = secondPage.body as { items: Array<{ id: string }> };
    expect(secondBody.items).toHaveLength(1);
    expect(secondBody.items[0]!.id).not.toBe(firstBody.items[0]!.id);

    const coursePage = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products?kind=course&limit=50",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(coursePage.status).toBe(200);
    const courseBody = coursePage.body as {
      items: Array<{
        id: string;
        currency: string;
        sales: number;
        customers: number;
      }>;
    };
    expect(courseBody.items).toHaveLength(1);
    expect(courseBody.items[0]).toMatchObject({
      id: world.noteA.publicId,
      currency: "USD",
      sales: 0,
      customers: 1,
    });

    const invalid = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products?limit=0",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(invalid.status).toBe(400);

    await runtime.close();
  });

  it("lists only published public products for an uncredentialed school host", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({ clock, billingMode: "oss" });
    const world = await seedWorld(runtime, clock);

    const freePlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${world.noteA.publicId}/plans`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    expect(freePlan.status).toBe(201);
    const published = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { status: "published", privacy: "public" },
    });
    expect(published.status).toBe(200);

    const hidden = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: {
        cookie: world.owner.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { kind: "course", title: "Hidden product", description: "" },
    });
    expect(hidden.status).toBe(201);

    const publicCatalog = await dispatch(runtime, {
      method: "GET",
      path: "/v1/public/products?limit=50",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicCatalog.status).toBe(200);
    expect(publicCatalog.body).toMatchObject({
      items: [
        {
          id: world.noteA.publicId,
          title: "Seed product",
          status: "published",
          privacy: "public",
          currency: "USD",
          priceMinor: 0,
        },
      ],
      nextCursor: null,
    });

    const publicDetail = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicDetail.status).toBe(200);
    expect(publicDetail.body).toMatchObject({
      id: world.noteA.publicId,
      status: "published",
      privacy: "public",
      enrolled: false,
    });

    const publicDetailBySlug = await dispatch(runtime, {
      method: "GET",
      path: "/v1/products/seed-product",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicDetailBySlug.status).toBe(200);
    expect(publicDetailBySlug.body).toMatchObject({
      id: world.noteA.publicId,
      slug: "seed-product",
      status: "published",
    });

    const [memberAccount] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.userId, world.member.id),
        ),
      );
    await runtime.db
      .update(schema.memberships)
      .set({ permissions: ["communities:read"] })
      .where(
        and(
          eq(schema.memberships.schoolId, world.schoolA.id),
          eq(schema.memberships.schoolAccountId, memberAccount!.id),
        ),
      );
    const publicWithAdminSession = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: {
        cookie: world.member.sessionCookie,
        "x-forwarded-host": "school-a.localhost:3001",
      },
    });
    expect(publicWithAdminSession.status).toBe(200);
    expect(publicWithAdminSession.body).toMatchObject({
      id: world.noteA.publicId,
      enrolled: false,
    });

    await runtime.close();
  });
});
