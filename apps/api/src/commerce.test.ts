import { describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { dispatch } from "./dispatch.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { MemoryPaymentProvider } from "./test-payment-provider.js";

function paymentEvent(id: string, event: unknown) {
  const rawBody = JSON.stringify(event);
  return {
    rawBody,
    headers: { "stripe-event-id": id },
  };
}

describe.serial("storefront commerce", () => {
  it("creates idempotent Stripe checkout and grants access only from a verified payment", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
    const provider = new MemoryPaymentProvider();
    const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Paid course", description: "commerce" },
    });
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Publication access", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Paid access",
        kind: "one_time",
        amountMinor: 2500,
        providerProductId: "pdt_paid_course",
      },
    });
    expect(plan.status).toBe(201);
    const planId = (plan.body as { id: string }).id;

    const signedUp = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "paid-learner@example.com",
        password: "learner-password-1",
        name: "Paid Learner",
      },
    });
    expect(signedUp.status).toBe(201);
    const cookie = (signedUp.headers?.["Set-Cookie"] ?? "").split(";", 1)[0];
    const learnerHeaders = {
      cookie,
      "x-school-id": world.schoolA.publicId,
      "idempotency-key": "purchase-1",
    };
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: learnerHeaders,
      body: { planId, returnUrl: "http://localhost:3000/checkout/complete" },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      planId,
      provider: "stripe",
      status: "pending",
      amountMinor: 2500,
      checkoutUrl: "https://checkout.test/stripe_checkout_1",
    });
    expect(provider.checkouts).toHaveLength(1);
    const checkoutId = (created.body as { id: string }).id;
    const pendingInvoices = await runtime.db
      .select()
      .from(schema.storefrontInvoices);
    expect(pendingInvoices).toHaveLength(1);
    expect(pendingInvoices[0]).toMatchObject({
      paymentId: null,
      status: "pending",
      membershipId: expect.any(String),
    });

    const replay = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: learnerHeaders,
      body: { planId, returnUrl: "http://localhost:3000/other" },
    });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(created.body);
    expect(provider.checkouts).toHaveLength(1);

    const mismatch = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: { ...learnerHeaders, "idempotency-key": "purchase-1" },
      body: { planId: "another-plan" },
    });
    expect(mismatch.status).toBe(409);
    expect(mismatch.body).toMatchObject({
      details: { reason: "idempotency_key_reused" },
    });

    const payment = paymentEvent("evt-payment-1", {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_stripe_1",
        amount: 2500,
        currency: "USD",
        metadata: { courselit_checkout_id: checkoutId },
      },
    });
    const received = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: payment.headers,
      rawBody: payment.rawBody,
    });
    expect(received.status).toBe(200);
    expect(received.body).toMatchObject({
      received: true,
      duplicate: false,
      status: "processed",
    });

    const checkout = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/checkouts/${checkoutId}`,
      headers: learnerHeaders,
    });
    expect(checkout.body).toMatchObject({
      status: "paid",
      checkoutUrl: "https://checkout.test/stripe_checkout_1",
    });
    const memberships = await runtime.db.select().from(schema.learnerMemberships);
    const payments = await runtime.db.select().from(schema.storefrontPayments);
    const invoices = await runtime.db.select().from(schema.storefrontInvoices);
    expect(memberships.filter((row) => row.entityType === "product")).toHaveLength(1);
    expect(payments).toHaveLength(1);
    expect(invoices).toHaveLength(1);
    expect(invoices[0]?.status).toBe("paid");

    const duplicate = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: payment.headers,
      rawBody: payment.rawBody,
    });
    expect(duplicate.status).toBe(200);
    expect(duplicate.body).toMatchObject({ duplicate: true });

    const failedAfterSuccess = paymentEvent("evt-payment-failed-after-success", {
      type: "payment.failed",
      data: { metadata: { courselit_checkout_id: checkoutId } },
    });
    const failed = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: failedAfterSuccess.headers,
      rawBody: failedAfterSuccess.rawBody,
    });
    expect(failed.status).toBe(200);
    const stillPaid = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/checkouts/${checkoutId}`,
      headers: learnerHeaders,
    });
    expect(stillPaid.body).toMatchObject({ status: "paid" });

    const refund = paymentEvent("evt-payment-refund", {
      type: "payment.refunded",
      data: { payment_id: "pay_stripe_1" },
    });
    const refunded = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: refund.headers,
      rawBody: refund.rawBody,
    });
    expect(refunded.status).toBe(200);
    const afterRefund = await dispatch(runtime, {
      method: "GET",
      path: `/v1/learner/checkouts/${checkoutId}`,
      headers: learnerHeaders,
    });
    expect(afterRefund.body).toMatchObject({ status: "refunded" });
    expect(
      (await runtime.db.select().from(schema.learnerMemberships))[0]?.status,
    ).toBe("expired");

    const deletion = await dispatch(runtime, {
      method: "DELETE",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
    });
    expect(deletion.status).toBe(409);
    expect(deletion.body).toMatchObject({
      details: { reason: "product_financial_history" },
    });

    const storedEvents = await runtime.db.select().from(schema.storefrontWebhookEvents);
    expect(storedEvents).toHaveLength(3);
    expect(storedEvents.every((event) => event.status === "processed")).toBe(true);
    await runtime.close();
  });

  it("rejects a signed payment whose amount or currency does not match the checkout", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
    const provider = new MemoryPaymentProvider();
    const runtime = await createPgliteRuntime({ clock, paymentProvider: provider });
    const world = await seedWorld(runtime, clock);
    const adminHeaders = {
      cookie: world.owner.sessionCookie,
      "x-school-id": world.schoolA.publicId,
    };
    const product = await dispatch(runtime, {
      method: "POST",
      path: "/v1/products",
      headers: adminHeaders,
      body: { title: "Mismatch course" },
    });
    const productId = (product.body as { id: string }).id;
    await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Publication access", kind: "free", amountMinor: 0 },
    });
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: {
        name: "Mismatch plan",
        kind: "one_time",
        amountMinor: 2500,
        providerProductId: "pdt_mismatch",
      },
    });
    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "mismatch@example.com",
        password: "learner-password-1",
        name: "Mismatch",
      },
    });
    const cookie = (learner.headers?.["Set-Cookie"] ?? "").split(";", 1)[0];
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: {
        cookie,
        "x-school-id": world.schoolA.publicId,
        "idempotency-key": "mismatch-1",
      },
      body: { planId: (plan.body as { id: string }).id },
    });
    const event = paymentEvent("evt-mismatch", {
      type: "payment.succeeded",
      data: {
        payment_id: "pay_mismatch",
        amount: 2501,
        currency: "USD",
        metadata: { courselit_checkout_id: (created.body as { id: string }).id },
      },
    });
    const response = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/webhooks/stripe",
      headers: event.headers,
      rawBody: event.rawBody,
    });
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      details: { reason: "webhook_processing_failed" },
    });
    const stored = await runtime.db
      .select()
      .from(schema.storefrontWebhookEvents)
      .where(eq(schema.storefrontWebhookEvents.providerEventId, "evt-mismatch"));
    expect(stored[0]?.status).toBe("failed");
    expect(await runtime.db.select().from(schema.storefrontPayments)).toHaveLength(0);
    await runtime.close();
  });

  it("supports public plan discovery and immediate idempotent free access", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
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
      body: { title: "Free course" },
    });
    const productId = (product.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free", kind: "free", amountMinor: 0 },
    });
    const planId = (plan.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      body: { status: "published" },
    });
    const publicPlans = await dispatch(runtime, {
      method: "GET",
      path: `/v1/storefront/products/${productId}/plans`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicPlans.status).toBe(200);
    expect(publicPlans.body).toMatchObject({ items: [{ id: planId, kind: "free" }] });

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: { email: "free@example.com", password: "learner-password-1", name: "Free" },
    });
    const cookie = (learner.headers?.["Set-Cookie"] ?? "").split(";", 1)[0];
    const checkout = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: {
        cookie,
        "x-school-id": world.schoolA.publicId,
        "idempotency-key": "free-1",
      },
      body: { planId },
    });
    expect(checkout.status).toBe(201);
    expect(checkout.body).toMatchObject({
      provider: "free",
      status: "paid",
      amountMinor: 0,
      checkoutUrl: null,
    });
    const replay = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: {
        cookie,
        "x-school-id": world.schoolA.publicId,
        "idempotency-key": "free-1",
      },
      body: { planId },
    });
    expect(replay.body).toEqual(checkout.body);
    expect(await runtime.db.select().from(schema.learnerMemberships)).toHaveLength(1);
    expect(await runtime.db.select().from(schema.storefrontPayments)).toHaveLength(1);
    expect(await runtime.db.select().from(schema.storefrontInvoices)).toHaveLength(1);
    await runtime.close();
  });

  it("keeps checkout selection server-side until an authenticated learner starts it", async () => {
    const clock = freezeRuntimeClock(new Date("2026-03-05T00:00:00.000Z"));
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
      body: { title: "Session course" },
    });
    const productId = (product.body as { id: string }).id;
    const plan = await dispatch(runtime, {
      method: "POST",
      path: `/v1/products/${productId}/plans`,
      headers: adminHeaders,
      body: { name: "Free access", kind: "free", amountMinor: 0 },
    });
    const planId = (plan.body as { id: string }).id;
    await dispatch(runtime, {
      method: "PATCH",
      path: `/v1/products/${productId}`,
      headers: adminHeaders,
      // Direct sales pages may be unlisted. They must still be able to start
      // checkout; privacy controls catalog visibility, not access to a link.
      body: { status: "published", privacy: "unlisted" },
    });
    const created = await dispatch(runtime, {
      method: "POST",
      path: "/v1/storefront/checkout-sessions",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: { productId, planId },
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      productId,
      planId,
      productTitle: "Session course",
      planType: "free",
      status: "open",
      checkoutId: null,
    });
    const sessionId = (created.body as { id: string }).id;

    const publicSession = await dispatch(runtime, {
      method: "GET",
      path: `/v1/storefront/checkout-sessions/${sessionId}`,
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
    });
    expect(publicSession.status).toBe(200);
    expect(publicSession.body).toMatchObject({ id: sessionId, status: "open" });

    const learner = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-forwarded-host": "school-a.localhost:3001" },
      body: {
        email: "session-learner@example.com",
        password: "learner-password-1",
        name: "Session Learner",
      },
    });
    const cookie = (learner.headers?.["Set-Cookie"] ?? "").split(";", 1)[0];
    const started = await dispatch(runtime, {
      method: "POST",
      path: `/v1/learner/checkout-sessions/${sessionId}/checkout`,
      headers: {
        cookie,
        "x-school-id": world.schoolA.publicId,
      },
      body: { returnUrl: "http://school-a.localhost:3001/checkout" },
    });
    expect(started.status).toBe(201);
    expect(started.body).toMatchObject({
      productId,
      planId,
      provider: "free",
      status: "paid",
    });

    const completed = await dispatch(runtime, {
      method: "GET",
      path: `/v1/storefront/checkout-sessions/${sessionId}`,
      headers: { cookie, "x-school-id": world.schoolA.publicId },
    });
    expect(completed.body).toMatchObject({
      id: sessionId,
      status: "completed",
      checkoutStatus: "paid",
    });
    await runtime.close();
  });
});
