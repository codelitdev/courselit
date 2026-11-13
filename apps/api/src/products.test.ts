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
    const firstPublishedAt = (withPlan.body as { publishedAt: string }).publishedAt;
    expect(firstPublishedAt).toBeTruthy();

    // Going back to draft keeps publishedAt, so admins can tell an offline
    // product from one that never went live.
    const offline = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { status: "draft" },
    });
    expect(offline.status).toBe(200);
    expect(offline.body).toMatchObject({
      status: "draft",
      publishedAt: firstPublishedAt,
    });

    await runtime.close();
  });

  it("creates a download as a lead magnet with its one free plan", async () => {
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
      body: { kind: "download", title: "Palette guide", leadMagnet: true },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ kind: "download", leadMagnet: true });
    const productId = (created.body as { id: string }).id;
    const plans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${productId}/plans`,
      headers,
    });
    expect(plans.status).toBe(200);
    const items = (plans.body as { items: Array<Record<string, unknown>> }).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "free", status: "active", isDefault: true });

    // The lead magnet stays valid: it can be saved again without changes.
    const resaved = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { leadMagnet: true },
    });
    expect(resaved.status).toBe(200);

    // A plain download starts without plans, and a course can't be a lead magnet.
    const plain = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "download", title: "Paid guide" },
    });
    expect(plain.body).toMatchObject({ leadMagnet: false });
    const plainPlans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${(plain.body as { id: string }).id}/plans`,
      headers,
    });
    expect((plainPlans.body as { items: unknown[] }).items).toHaveLength(0);
    const course = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers,
      body: { kind: "course", title: "Not a magnet", leadMagnet: true },
    });
    expect(course.status).toBe(400);
  });

  it("gives new lessons the product's default status", async () => {
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
      body: { kind: "course", title: "Default lesson status" },
    });
    expect(created.status).toBe(201);
    const productId = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({ newLessonStatus: "draft", publishedAt: null });

    const draftLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers,
      body: { title: "Starts as a draft" },
    });
    expect(draftLesson.status).toBe(201);
    expect(draftLesson.body).toMatchObject({ status: "draft" });

    const updated = await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers,
      body: { newLessonStatus: "published" },
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ newLessonStatus: "published" });

    const liveLesson = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers,
      body: { title: "Starts live" },
    });
    expect(liveLesson.status).toBe(201);
    expect(liveLesson.body).toMatchObject({ status: "published" });
    expect(
      (liveLesson.body as { publishedAt: string | null }).publishedAt,
    ).toBeTruthy();

    // An explicit status still wins over the default.
    const explicitDraft = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/lessons`,
      headers,
      body: { title: "Explicit draft", status: "draft" },
    });
    expect(explicitDraft.body).toMatchObject({ status: "draft" });

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

    // One paid sale, partly refunded, and one free sign-up: only the money
    // kept counts as sales.
    const [note] = await runtime.db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.publicId, world.noteA.publicId));
    for (const [index, amountMinor] of [1250, 0].entries()) {
      const planId = uuidv7(clock);
      const checkoutId = uuidv7(clock);
      await runtime.db.insert(schema.storefrontPlans).values({
        id: planId,
        publicId: createPublicId("pln", clock),
        schoolId: world.schoolA.id,
        entityType: "product",
        entityId: world.noteA.publicId,
        name: amountMinor ? "Paid" : "Free",
        description: "",
        includedProducts: [],
        providerProductId: null,
        kind: amountMinor ? "one_time" : "free",
        amountMinor,
        billingInterval: null,
        installmentCount: null,
        status: "active",
        isDefault: index === 0,
        createdBy: world.owner.id,
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
      await runtime.db.insert(schema.storefrontCheckoutAttempts).values({
        id: checkoutId,
        publicId: createPublicId("chk", clock),
        schoolId: world.schoolA.id,
        schoolAccountId: learnerId,
        productId: note!.id,
        planId,
        provider: "stripe",
        idempotencyKey: `list-sales-${index}`,
        providerCheckoutId: `checkout_list_${index}`,
        providerCheckoutUrl: null,
        status: "paid",
        currency: "USD",
        amountMinor,
        createdAt: clock.now(),
        updatedAt: clock.now(),
        completedAt: clock.now(),
      });
      await runtime.db.insert(schema.storefrontPayments).values({
        id: uuidv7(clock),
        publicId: createPublicId("pay", clock),
        checkoutId,
        providerPaymentId: `payment_list_${index}`,
        kind: "one_time",
        status: "succeeded",
        currency: "USD",
        amountMinor,
        refundedAmountMinor: amountMinor ? 250 : 0,
        occurredAt: clock.now(),
        createdAt: clock.now(),
        updatedAt: clock.now(),
      });
    }

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
        salesAmountMinor: number;
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
        salesAmountMinor: number;
        customers: number;
      }>;
    };
    expect(courseBody.items).toHaveLength(1);
    expect(courseBody.items[0]).toMatchObject({
      id: world.noteA.publicId,
      currency: "USD",
      salesAmountMinor: 1000,
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
      path: `/v1/public/${world.schoolA.publicId}/products?limit=50`,
      headers: { host: "courselit-api:4000" },
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
      path: `/v1/public/${world.schoolA.publicId}/products/${world.noteA.publicId}`,
      headers: {},
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
      path: `/v1/public/${world.schoolA.publicId}/products/seed-product`,
      headers: {},
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
    // An admin session never changes the public product view, and the admin
    // product route still requires products:read.
    const publicWithAdminSession = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolA.publicId}/products/${world.noteA.publicId}`,
      headers: { cookie: world.member.sessionCookie },
    });
    expect(publicWithAdminSession.status).toBe(200);
    expect(publicWithAdminSession.body).toMatchObject({
      id: world.noteA.publicId,
      enrolled: false,
    });
    const adminReadWithoutPermission = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: {
        cookie: world.member.sessionCookie,
        "x-school-id": world.schoolA.publicId,
      },
    });
    expect(adminReadWithoutPermission.status).toBe(403);
    const adminReadWithoutSession = await dispatch(runtime, {
      method: "GET",
      path: `/v1/products/${world.noteA.publicId}`,
      headers: { "x-school-id": world.schoolA.publicId },
    });
    expect(adminReadWithoutSession.status).toBe(401);

    // Another school's path does not expose this school's product.
    const otherSchool = await dispatch(runtime, {
      method: "GET",
      path: `/v1/public/${world.schoolB.publicId}/products/${world.noteA.publicId}`,
      headers: {},
    });
    expect(otherSchool.status).toBe(404);

    await runtime.close();
  });
});
