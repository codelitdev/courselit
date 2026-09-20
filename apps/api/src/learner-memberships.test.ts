import { describe, expect, it } from "bun:test";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";

function learnerCookie(response: { headers?: Record<string, string> }) {
  const value = response.headers?.["Set-Cookie"];
  if (!value) throw new Error("missing_learner_cookie");
  return value.split(";", 1)[0]!;
}

function paymentEvent(id: string, event: unknown) {
  return {
    headers: { "stripe-event-id": id },
    rawBody: JSON.stringify(event),
  };
}

describe.serial("learner memberships", () => {
  it("does not create the retired enrollment tables", async () => {
    const runtime = await createPgliteRuntime({});
    const result = await runtime.db.execute<{ tablename: string }>(sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('enrollments', 'enrollment_access_grants')
      ORDER BY tablename
    `);
    expect(result.rows).toEqual([]);
    await runtime.close();
  });

  it("creates a direct membership and links paid checkout, invoice, and subscription", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
    const provider = new MemoryPaymentProvider();
    const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Membership course", description: "Access is membership based." },
    });
    const productId = (created.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Monthly access",
        kind: "subscription",
        subscriptionMonthlyAmount: 25,
        amountMinor: 2500,
        billingInterval: "month",
        providerProductId: "membership-course-monthly",
      },
    });
    expect(plan.status).toBe(201);
    const planId = (plan.body as { id: string }).id;
    expect(
      await dispatch(runtime, {
        method: "PATCH",
        path: `/v1/products/${productId}`,
        headers: adminHeaders,
        body: { status: "published" },
      }),
    ).toMatchObject({ status: 200 });

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "membership-course@example.com",
        password: "learner-password-1",
        name: "Membership Learner",
      },
    });
    const headers = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
      "idempotency-key": "membership-course-checkout",
    };
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers,
      body: { planId },
    });
    expect(checkout.status).toBe(201);
    expect(checkout.body).toMatchObject({ status: "pending", planId });
    const checkoutId = (checkout.body as { id: string }).id;
    expect(await runtime.db.select().from(schema.storefrontInvoices)).toMatchObject([
      {
        paymentId: null,
        status: "pending",
        membershipId: expect.any(String),
      },
    ]);

    let memberships = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.entityType, "product"));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      entityType: "product",
      entityId: productId,
      paymentPlanId: planId,
      status: "pending",
      isIncludedInPlan: false,
    });

    const paid = paymentEvent("learner-membership-paid", {
      type: "payment.succeeded",
      data: {
        payment_id: "membership-course-payment",
        subscription_id: "membership-course-subscription",
        amount: 2500,
        currency: "USD",
        metadata: { courselit_checkout_id: checkoutId },
      },
    });
    expect(
      await dispatch(runtime, {
        method: "POST",
        path: "/v1/storefront/webhooks/stripe",
        headers: paid.headers,
        rawBody: paid.rawBody,
      }),
    ).toMatchObject({ status: 200, body: { duplicate: false, status: "processed" } });

    memberships = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.entityType, "product"));
    expect(memberships).toHaveLength(1);
    expect(memberships[0]).toMatchObject({
      status: "active",
      subscriptionId: "membership-course-subscription",
      subscriptionMethod: "stripe",
    });
    const invoices = await runtime.db.select().from(schema.storefrontInvoices);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.status).toBe("paid");
    expect(invoices[0]?.membershipId).toBe(memberships[0]?.id);
    const payments = await runtime.db.select().from(schema.storefrontPayments);
    expect(payments[0]?.membershipId).toBe(memberships[0]?.id);

    const duplicate = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: paid.headers,
      rawBody: paid.rawBody,
    });
    expect(duplicate).toMatchObject({ status: 200, body: { duplicate: true } });
    await runtime.close();
  });

  it("fans out community access to included product memberships and preserves direct access on leave", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
    const runtime = await createPgliteRuntime({
      clock,
      paymentProvider: new MemoryPaymentProvider(),
    });
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
    const productPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free product access", kind: "free", amountMinor: 0 },
    });
    const productPlanId = (productPlan.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });

    const [communityRow] = await runtime.db
      .select()
      .from(schema.communities)
      .where(eq(schema.communities.schoolId, world.schoolA.id));
    const communityId = communityRow!.publicId;
    const communityPlan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/communities/${communityId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Community free access",
        kind: "free",
        type: "free",
        includedProducts: [productId],
      },
    });
    const communityPlanId = (communityPlan.body as { id: string }).id;

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        email: "included-membership@example.com",
        password: "learner-password-1",
        name: "Included Membership Learner",
      },
    });
    const headers = {
      cookie: learnerCookie(learner),
      "x-school-id": world.schoolA.publicId,
    };
    const direct = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: { ...headers, "idempotency-key": "direct-included-course" },
      body: { planId: productPlanId },
    });
    expect(direct.status).toBe(201);

    const communityCheckout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...headers, "idempotency-key": "included-community" },
      body: { planId: communityPlanId },
    });
    expect(communityCheckout.status).toBe(201);
    const rows = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, (await runtime.db
        .select({ id: schema.schoolAccounts.id })
        .from(schema.schoolAccounts)
        .where(eq(schema.schoolAccounts.email, "included-membership@example.com"))
        .limit(1))[0]!.id));
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.entityType === "community")).toHaveLength(1);
    expect(rows.filter((row) => row.entityType === "product" && row.isIncludedInPlan)).toHaveLength(1);
    expect(rows.filter((row) => row.entityType === "product" && !row.isIncludedInPlan)).toHaveLength(1);
    expect(rows.find((row) => row.isIncludedInPlan)?.paymentPlanId).toBe(communityPlanId);

    const left = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/leave`,
      headers,
      body: {},
    });
    expect(left.status).toBe(200);
    const afterLeave = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, rows[0]!.schoolAccountId));
    expect(afterLeave.find((row) => row.entityType === "community")?.status).toBe("expired");
    expect(afterLeave.find((row) => row.isIncludedInPlan)?.status).toBe("expired");
    expect(afterLeave.find((row) => row.entityType === "product" && !row.isIncludedInPlan)?.status).toBe("active");

    expect(
      afterLeave.find(
        (row) => row.entityType === "product" && !row.isIncludedInPlan,
      )?.status,
    ).toBe("active");
    await runtime.close();
  });

  it("keeps manual-approval community memberships pending without granting included products", async () => {
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
      body: { title: "Approval included course" },
    });
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
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
      body: { name: "Approval access", kind: "free", type: "free", includedProducts: [productId] },
    });
    const planId = (plan.body as { id: string }).id;
    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "approval-membership@example.com", password: "learner-password-1", name: "Approval" },
    });
    const headers = { cookie: learnerCookie(learner), "x-school-id": world.schoolA.publicId };
    const missingReason = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...headers, "idempotency-key": "approval-community-missing-reason" },
      body: { planId },
    });
    expect(missingReason.status).toBe(400);
    expect(missingReason.body).toMatchObject({
      details: { reason: "joining_reason_required" },
    });

    expect(
      await dispatch(runtime, {
        method: "POST",
        path: `/v1/learner/communities/${communityId}/checkout`,
        headers: { ...headers, "idempotency-key": "approval-community" },
        body: { planId, joiningReason: "I would like to participate." },
      }),
    ).toMatchObject({ status: 201, body: { status: "paid" } });
    const learnerId = (await runtime.db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "approval-membership@example.com"))
      .limit(1))[0]!.id;
    const rows = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, learnerId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ entityType: "community", status: "pending" });
    const adminNotifications = await dispatch(runtime, {
      method: "GET",
      path: "/v1/notifications",
      headers: adminHeaders,
    });
    expect(adminNotifications.status).toBe(200);
    expect(
      (
        adminNotifications.body as {
          items: Array<{
            id: string;
            type: string;
            title: string;
            body: string;
            href: string | null;
            readAt: string | null;
            createdAt: string;
          }>;
        }
      ).items,
    ).toContainEqual({
      type: "community_membership_requested",
      title: "New community membership request",
      body: expect.any(String),
      href: `/community/memberships`,
      id: expect.any(String),
      readAt: null,
      createdAt: expect.any(String),
    });
    await runtime.close();
  });

  it("cancels the provider subscription when a community membership is revoked", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-10T00:00:00.000Z"));
    const provider = new MemoryPaymentProvider();
    const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = { cookie: world.owner.sessionCookie, "x-school-id": world.schoolA.publicId };
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
        name: "Monthly community access",
        kind: "subscription",
        type: "subscription",
        subscriptionMonthlyAmount: 10,
        amountMinor: 1000,
        billingInterval: "month",
        providerProductId: "subscription-community",
      },
    });
    const planId = (plan.body as { id: string }).id;
    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: { email: "subscription-community@example.com", password: "learner-password-1", name: "Subscription" },
    });
    const headers = { cookie: learnerCookie(learner), "x-school-id": world.schoolA.publicId };
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/communities/${communityId}/checkout`,
      headers: { ...headers, "idempotency-key": "subscription-community-checkout" },
      body: { planId },
    });
    expect(await runtime.db.select().from(schema.communityInvoices)).toMatchObject([
      {
        paymentId: null,
        status: "pending",
        membershipId: expect.any(String),
      },
    ]);
    const checkoutId = (checkout.body as { id: string }).id;
    const paid = paymentEvent("subscription-community-paid", {
      type: "payment.succeeded",
      data: {
        payment_id: "subscription-community-payment",
        subscription_id: "subscription-community-provider-sub",
        amount: 1000,
        currency: "USD",
        metadata: { courselit_community_checkout_id: checkoutId },
      },
    });
    expect(
      await dispatch(runtime, {
        method: "POST",
        path: "/v1/storefront/webhooks/stripe",
        headers: paid.headers,
        rawBody: paid.rawBody,
      }),
    ).toMatchObject({ status: 200 });
    expect(
      await dispatch(runtime, {
        method: "POST",
        path: `/v1/learner/communities/${communityId}/leave`,
        headers,
        body: {},
      }),
    ).toMatchObject({ status: 200, body: { left: true } });
    const [learnerAccount] = await runtime.db
      .select({ id: schema.schoolAccounts.id })
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.email, "subscription-community@example.com"))
      .limit(1);
    const rows = await runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.schoolAccountId, learnerAccount!.id));
    expect(rows.find((row) => row.entityType === "community")?.status).toBe("expired");
    expect((await runtime.db.select().from(schema.communitySubscriptions))[0]?.status).toBe("cancelled");
    await runtime.close();
  });
});
