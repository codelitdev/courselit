// Regression tests for school payments: production-shaped provider webhook
// sequences replayed through the real provider classes (real signature
// verification and event mapping) against product and community checkouts,
// plus learner and creator subscription cancellation.
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { type PaymentProvider, paymentProviderFromSettings } from "./payments.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { seedWorld } from "./seed.js";
import { dispatch } from "./test-learner-auth.js";

const NOW = new Date("2026-03-05T00:00:00.000Z");
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);
const PERIOD_END = new Date("2026-04-05T00:00:00.000Z");
const PERIOD_END_SECONDS = Math.floor(PERIOD_END.getTime() / 1000);

const STRIPE_WEBHOOK_SECRET = "whsec_courselit_test";
const LEMON_WEBHOOK_SECRET = "lemon_courselit_test";
const RAZORPAY_WEBHOOK_SECRET = "razorpay_courselit_test";

type ProviderName = "stripe" | "lemonsqueezy" | "razorpay";

function realProvider(name: ProviderName): PaymentProvider {
  const provider =
    name === "stripe"
      ? paymentProviderFromSettings({
          provider: "stripe",
          stripe: {
            secretKey: "sk_test_courselit",
            webhookSecret: STRIPE_WEBHOOK_SECRET,
          },
        })
      : name === "lemonsqueezy"
        ? paymentProviderFromSettings({
            provider: "lemonsqueezy",
            lemonsqueezy: {
              apiKey: "lemon_api_key",
              storeId: "store_1",
              oneTimeVariantId: "variant_one_time",
              monthlyVariantId: "variant_monthly",
              yearlyVariantId: "variant_yearly",
              webhookSecret: LEMON_WEBHOOK_SECRET,
            },
          })
        : paymentProviderFromSettings({
            provider: "razorpay",
            razorpay: {
              keyId: "rzp_test_key",
              keySecret: "rzp_test_secret",
              webhookSecret: RAZORPAY_WEBHOOK_SECRET,
            },
          });
  if (!provider) throw new Error("provider_missing");
  return provider;
}

// ---------------------------------------------------------------------------
// Outbound provider API stub. Only provider hosts are intercepted.
// ---------------------------------------------------------------------------

type ProviderCall = { method: string; url: string; body: string };
let calls: ProviderCall[] = [];
let failSubscriptionCalls = false;
let refuseCheckouts = false;
const originalFetch = globalThis.fetch;

function providerResponse(method: string, url: string): unknown {
  const n = calls.length;
  if (url === "https://api.stripe.com/v1/checkout/sessions") {
    return { id: `cs_test_${n}`, url: `https://checkout.stripe.test/cs_test_${n}` };
  }
  if (url.startsWith("https://api.stripe.com/v1/invoice_payments?")) {
    // Invoice `in_x` was paid by payment intent `pi_x`.
    const invoice = new URL(url).searchParams.get("invoice") ?? "";
    return {
      object: "list",
      data: [
        {
          object: "invoice_payment",
          invoice,
          status: "paid",
          payment: { type: "payment_intent", payment_intent: invoice.replace(/^in_/, "pi_") },
        },
      ],
    };
  }
  if (url.startsWith("https://api.stripe.com/v1/subscriptions/")) {
    const id = decodeURIComponent(url.split("/").pop()!);
    if (method === "POST") {
      return {
        id,
        object: "subscription",
        status: "active",
        cancel_at_period_end: true,
        cancel_at: PERIOD_END_SECONDS,
        current_period_end: PERIOD_END_SECONDS,
      };
    }
    return {
      id,
      object: "subscription",
      status: method === "DELETE" ? "canceled" : "active",
    };
  }
  if (url === "https://api.lemonsqueezy.com/v1/checkouts") {
    return {
      data: {
        type: "checkouts",
        id: `lemon_checkout_${n}`,
        attributes: { url: `https://store.lemonsqueezy.test/checkout/${n}` },
      },
    };
  }
  if (url.startsWith("https://api.lemonsqueezy.com/v1/subscriptions/")) {
    return {
      data: {
        type: "subscriptions",
        id: url.split("/").pop(),
        attributes: {
          status: "cancelled",
          cancelled: true,
          ends_at: PERIOD_END.toISOString(),
        },
      },
    };
  }
  if (url === "https://api.razorpay.com/v1/orders") return { id: `order_rzp_${n}` };
  if (url === "https://api.razorpay.com/v1/plans") return { id: `plan_rzp_${n}` };
  if (url === "https://api.razorpay.com/v1/subscriptions")
    return { id: `sub_rzp_${n}` };
  if (url.startsWith("https://api.razorpay.com/v1/subscriptions/")) {
    return { id: url.split("/")[5], status: "active", current_end: PERIOD_END_SECONDS };
  }
  return null;
}

beforeEach(() => {
  calls = [];
  failSubscriptionCalls = false;
  refuseCheckouts = false;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    if (
      !url.startsWith("https://api.stripe.com/") &&
      !url.startsWith("https://api.lemonsqueezy.com/") &&
      !url.startsWith("https://api.razorpay.com/")
    ) {
      return originalFetch(input, init);
    }
    calls.push({ method, url, body: typeof init?.body === "string" ? init.body : "" });
    if (failSubscriptionCalls && url.includes("/subscriptions/")) {
      return new Response(JSON.stringify({ error: "unavailable" }), { status: 503 });
    }
    if (refuseCheckouts && url === "https://api.stripe.com/v1/checkout/sessions") {
      return new Response(
        JSON.stringify({ error: { message: "Invalid API Key provided" } }),
        { status: 401 },
      );
    }
    return new Response(JSON.stringify(providerResponse(method, url) ?? {}), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function subscriptionCancelCalls() {
  return calls.filter(
    (call) =>
      (call.url.includes("/v1/subscriptions/") &&
        (call.method === "DELETE" || call.method === "POST")) ||
      call.url.endsWith("/cancel"),
  );
}

// ---------------------------------------------------------------------------
// Signed webhook delivery.
// ---------------------------------------------------------------------------

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

let eventSequence = 0;

function signed(provider: ProviderName, event: unknown, eventId?: string) {
  const rawBody = JSON.stringify(event);
  if (provider === "stripe") {
    return {
      rawBody,
      headers: {
        "stripe-signature": `t=${NOW_SECONDS},v1=${hmac(STRIPE_WEBHOOK_SECRET, `${NOW_SECONDS}.${rawBody}`)}`,
      },
    };
  }
  if (provider === "lemonsqueezy") {
    return {
      rawBody,
      headers: {
        "x-event-name": (event as { meta: { event_name: string } }).meta.event_name,
        "x-signature": hmac(LEMON_WEBHOOK_SECRET, rawBody),
      },
    };
  }
  return {
    rawBody,
    headers: {
      "x-razorpay-event-id": eventId ?? `evt_rzp_${++eventSequence}`,
      "x-razorpay-signature": hmac(RAZORPAY_WEBHOOK_SECRET, rawBody),
    },
  };
}

function stripeEvent(type: string, object: Record<string, unknown>, id?: string) {
  return {
    id: id ?? `evt_${++eventSequence}`,
    object: "event",
    api_version: "2024-06-20",
    created: NOW_SECONDS,
    type,
    data: { object },
  };
}

function lemonEvent(
  eventName: string,
  customData: Record<string, string>,
  data: { type: string; id: string; attributes: Record<string, unknown> },
) {
  return {
    meta: { event_name: eventName, custom_data: customData, test_mode: true },
    data,
  };
}

// ---------------------------------------------------------------------------
// World setup.
// ---------------------------------------------------------------------------

type Env = Awaited<ReturnType<typeof setup>>;

async function setup(providerName: ProviderName) {
  const clock = freezeRuntimeClock(NOW);
  const runtime = await createPgliteRuntime({
    clock,
    paymentProvider: realProvider(providerName),
  });
  const world = await seedWorld(runtime, clock);
  const admin = {
    cookie: world.owner.sessionCookie,
    "x-school-id": world.schoolA.publicId,
  };

  async function deliver(event: unknown, eventId?: string) {
    const { rawBody, headers } = signed(providerName, event, eventId);
    return dispatch(runtime, {
      method: "POST",
      path: `/v1/storefront/webhooks/${providerName}`,
      headers,
      rawBody,
    });
  }

  async function signUp(email: string) {
    const response = await dispatch(runtime, {
      method: "POST",
      path: "/v1/learner/auth/sign-up",
      headers: { "x-school-id": world.schoolA.publicId },
      body: {
        schoolId: world.schoolA.publicId,
        email,
        password: "learner-password-1",
        name: email,
      },
    });
    expect(response.status).toBe(201);
    const cookie = (response.headers?.["Set-Cookie"] ?? "").split(";", 1)[0]!;
    const [account] = await runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, world.schoolA.id),
          eq(schema.schoolAccounts.email, email),
        ),
      );
    return {
      headers: { cookie, "x-school-id": world.schoolA.publicId },
      account: account!,
    };
  }

  return { clock, runtime, world, admin, deliver, signUp, providerName };
}

const PLANS = {
  one_time: { name: "Lifetime", type: "onetime", oneTimeAmount: 25 },
  subscription: {
    name: "Monthly",
    type: "subscription",
    subscriptionMonthlyAmount: 10,
    billingInterval: "month",
  },
  installment: {
    name: "Three payments",
    type: "emi",
    emiAmount: 30,
    emiTotalInstallments: 3,
  },
} as const;

const AMOUNTS = { one_time: 2500, subscription: 1000, installment: 3000 } as const;

type PlanKind = keyof typeof PLANS;

/** Metadata the provider was asked to attach to the checkout. */
function checkoutMetadata(env: Env): Record<string, string> {
  const call = [...calls]
    .reverse()
    .find(
      (candidate) =>
        candidate.url.endsWith("/checkout/sessions") ||
        candidate.url.endsWith("/checkouts") ||
        candidate.url.endsWith("/orders") ||
        candidate.url.endsWith("/v1/subscriptions"),
    );
  if (!call) throw new Error("no_checkout_call");
  if (env.providerName === "stripe") {
    const form = new URLSearchParams(call.body);
    const result: Record<string, string> = {};
    for (const [key, value] of form) {
      const match = /^metadata\[(.+)\]$/.exec(key);
      if (match) result[match[1]!] = value;
    }
    return result;
  }
  const body = JSON.parse(call.body) as {
    notes?: Record<string, string>;
    data?: { attributes: { checkout_data: { custom: Record<string, string> } } };
  };
  return body.notes ?? body.data!.attributes.checkout_data.custom;
}

async function buyProduct(env: Env, kind: PlanKind, email = `${kind}@example.com`) {
  const product = await dispatch(env.runtime, {
    method: "POST",
    path: "/v1/products",
    headers: env.admin,
    body: { title: `Course ${kind}` },
  });
  const productId = (product.body as { id: string }).id;
  const plan = await dispatch(env.runtime, {
    method: "POST",
    path: `/v1/products/${productId}/plans`,
    headers: env.admin,
    body: PLANS[kind],
  });
  expect(plan.status).toBe(201);
  const planId = (plan.body as { id: string }).id;
  await dispatch(env.runtime, {
    method: "PATCH",
    path: `/v1/products/${productId}`,
    headers: env.admin,
    body: { status: "published" },
  });
  const learner = await env.signUp(email);
  const checkout = await dispatch(env.runtime, {
    method: "POST",
    path: "/v1/learner/checkout",
    headers: { ...learner.headers, "idempotency-key": `buy-${email}` },
    body: { planId, returnUrl: "http://localhost:3000/checkout/complete" },
  });
  expect(checkout.status).toBe(201);
  const body = checkout.body as {
    id: string;
    checkoutData: { subscriptionId?: string; orderId?: string } | null;
  };
  return {
    productId,
    planId,
    learner,
    checkoutId: body.id,
    razorpayId: body.checkoutData?.subscriptionId ?? body.checkoutData?.orderId ?? null,
    metadata: checkoutMetadata(env),
  };
}

async function joinCommunity(
  env: Env,
  kind: PlanKind,
  email = `community-${kind}@example.com`,
) {
  const [community] = await env.runtime.db
    .select()
    .from(schema.communities)
    .where(eq(schema.communities.schoolId, env.world.schoolA.id));
  await env.runtime.db
    .update(schema.communities)
    .set({ enabled: true })
    .where(eq(schema.communities.id, community!.id));
  const plan = await dispatch(env.runtime, {
    method: "POST",
    path: `/v1/communities/${community!.publicId}/plans`,
    headers: env.admin,
    body: PLANS[kind],
  });
  expect(plan.status).toBe(201);
  const learner = await env.signUp(email);
  const checkout = await dispatch(env.runtime, {
    method: "POST",
    path: `/v1/learner/communities/${community!.publicId}/checkout`,
    headers: { ...learner.headers, "idempotency-key": `join-${email}` },
    body: {
      planId: (plan.body as { id: string }).id,
      returnUrl: "http://localhost:3000/community/checkout/complete",
    },
  });
  expect(checkout.status).toBe(201);
  return {
    communityId: community!.publicId,
    learner,
    checkoutId: (checkout.body as { id: string }).id,
    metadata: checkoutMetadata(env),
  };
}

async function productState(env: Env, productId: string) {
  const payments = await env.runtime.db.select().from(schema.storefrontPayments);
  const invoices = await env.runtime.db.select().from(schema.storefrontInvoices);
  const memberships = await env.runtime.db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.entityType, "product"),
        eq(schema.learnerMemberships.entityId, productId),
      ),
    );
  const subscriptions = await env.runtime.db
    .select()
    .from(schema.storefrontSubscriptions);
  return {
    payments,
    paidInvoices: invoices.filter((invoice) => invoice.status === "paid"),
    invoices,
    membership: memberships[0],
    subscription: subscriptions[0],
    subscriptions,
  };
}

async function communityState(
  env: Env,
  join: { communityId: string; learner: { account: { id: string } } },
) {
  const payments = await env.runtime.db.select().from(schema.communityPayments);
  const invoices = await env.runtime.db.select().from(schema.communityInvoices);
  const memberships = await env.runtime.db
    .select()
    .from(schema.learnerMemberships)
    .where(
      and(
        eq(schema.learnerMemberships.entityType, "community"),
        eq(schema.learnerMemberships.entityId, join.communityId),
        eq(schema.learnerMemberships.schoolAccountId, join.learner.account.id),
      ),
    );
  const subscriptions = await env.runtime.db
    .select()
    .from(schema.communitySubscriptions);
  return {
    payments,
    paidInvoices: invoices.filter((invoice) => invoice.status === "paid"),
    invoices,
    membership: memberships[0],
    subscription: subscriptions[0],
  };
}

function expectProcessed(response: { status: number; body?: unknown }) {
  expect(response.status).toBe(200);
  expect(response.body).toMatchObject({ received: true });
}

// ---------------------------------------------------------------------------
// Stripe event builders (shapes per the Stripe API reference).
// ---------------------------------------------------------------------------

function stripeSession(
  metadata: Record<string, string>,
  amount: number,
  recurring: { subscription: string; invoice: string } | null,
  paymentIntent = "pi_one_time",
) {
  return {
    id: `cs_test_${amount}`,
    object: "checkout.session",
    mode: recurring ? "subscription" : "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: amount,
    currency: "usd",
    customer: "cus_1",
    payment_intent: recurring ? null : paymentIntent,
    subscription: recurring?.subscription ?? null,
    invoice: recurring?.invoice ?? null,
    metadata,
  };
}

function stripeInvoice(
  metadata: Record<string, string>,
  input: {
    id: string;
    paymentIntent: string;
    subscription: string;
    amount: number;
    reason: "subscription_create" | "subscription_cycle";
    basil?: boolean;
  },
) {
  const subscriptionDetails = { metadata };
  return {
    id: input.id,
    object: "invoice",
    billing_reason: input.reason,
    status: "paid",
    paid: true,
    amount_due: input.amount,
    amount_paid: input.amount,
    currency: "usd",
    customer: "cus_1",
    period_start: NOW_SECONDS,
    period_end: PERIOD_END_SECONDS,
    ...(input.basil
      ? {
          // API 2025-03-31+: subscription and payment intent moved.
          parent: {
            type: "subscription_details",
            subscription_details: { metadata, subscription: input.subscription },
          },
        }
      : {
          payment_intent: input.paymentIntent,
          subscription: input.subscription,
          subscription_details: subscriptionDetails,
        }),
    metadata: {},
  };
}

function stripeCharge(input: {
  paymentIntent: string;
  invoice: string | null;
  amount: number;
}) {
  return {
    id: `ch_${input.paymentIntent}`,
    object: "charge",
    amount: input.amount,
    amount_refunded: input.amount,
    refunded: true,
    currency: "usd",
    payment_intent: input.paymentIntent,
    invoice: input.invoice,
    metadata: {},
  };
}

function stripeSubscription(
  metadata: Record<string, string>,
  id: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    object: "subscription",
    status,
    cancel_at_period_end: false,
    cancel_at: null,
    current_period_end: PERIOD_END_SECONDS,
    metadata,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.serial("payment webhooks: Stripe products", () => {
  it("records a one-time purchase once and creates sessions without promo codes", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "one_time");
    const form = new URLSearchParams(calls[0]!.body);
    expect(form.get("allow_promotion_codes")).toBeNull();
    expect(form.get("mode")).toBe("payment");
    expect(form.get("payment_intent_data[metadata][courselit_checkout_id]")).toBe(
      sale.checkoutId,
    );

    const completed = stripeEvent(
      "checkout.session.completed",
      stripeSession(sale.metadata, AMOUNTS.one_time, null, "pi_once"),
    );
    expectProcessed(await env.deliver(completed));
    expect(await env.deliver(completed)).toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
    // The same payment reported again under a new event id.
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "checkout.session.async_payment_succeeded",
          stripeSession(sale.metadata, AMOUNTS.one_time, null, "pi_once"),
        ),
      ),
    );
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(1);
    expect(state.paidInvoices).toHaveLength(1);
    expect(state.membership?.status).toBe("active");
    const purchases = await env.runtime.db
      .select()
      .from(schema.activities)
      .where(eq(schema.activities.type, "purchased"));
    expect(purchases).toHaveLength(1);

    // Refunds of a one-time Stripe payment arrive as the payment intent.
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "charge.refunded",
          stripeCharge({
            paymentIntent: "pi_once",
            invoice: null,
            amount: AMOUNTS.one_time,
          }),
        ),
      ),
    );
    const refunded = await productState(env, sale.productId);
    expect(refunded.payments[0]?.status).toBe("refunded");
    expect(refunded.invoices[0]?.status).toBe("refunded");
    expect(refunded.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  it("rejects a payment whose amount differs from the checkout", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "subscription");
    const response = await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(sale.metadata, AMOUNTS.subscription - 100, {
          subscription: "sub_discounted",
          invoice: "in_discounted",
        }),
      ),
    );
    expect(response.status).toBe(400);
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(0);
    expect(state.membership?.status).toBe("pending");
    await env.runtime.close();
  });

  it("acknowledges events that aren't about a CourseLit purchase", async () => {
    // The school's Stripe account may serve other apps; failing their events
    // would make Stripe retry them for days and then disable the endpoint.
    const env = await setup("stripe");
    const unrelated = await env.deliver(
      stripeEvent("charge.refunded", {
        ...stripeCharge({ paymentIntent: "pi_elsewhere", invoice: null, amount: 1234 }),
      }),
    );
    expect(unrelated).toMatchObject({ status: 200, body: { status: "ignored" } });
    await env.runtime.close();
  });

  it("ignores events signed for another school that point at this school's records", async () => {
    // Every school owner sets their own webhook secret, so a signed event only
    // proves it came from the school it names. That school must not reach
    // checkouts or payments that belong to another school.
    const env = await setup("stripe");
    const sale = await buyProduct(env, "one_time");
    const otherSchool = { courselit_school_id: env.world.schoolB.publicId };

    const forged = await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession({ ...sale.metadata, ...otherSchool }, AMOUNTS.one_time, null, "pi_forged"),
      ),
    );
    expect(forged).toMatchObject({ status: 200, body: { status: "ignored" } });
    let state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(0);
    expect(state.membership?.status).toBe("pending");

    expectProcessed(
      await env.deliver(
        stripeEvent(
          "checkout.session.completed",
          stripeSession(sale.metadata, AMOUNTS.one_time, null, "pi_real"),
        ),
      ),
    );
    const refund = await env.deliver(
      stripeEvent("charge.refunded", {
        ...stripeCharge({ paymentIntent: "pi_real", invoice: null, amount: AMOUNTS.one_time }),
        metadata: otherSchool,
      }),
    );
    expect(refund).toMatchObject({ status: 200, body: { status: "ignored" } });
    state = await productState(env, sale.productId);
    expect(state.payments[0]?.status).toBe("succeeded");
    expect(state.membership?.status).toBe("active");
    await env.runtime.close();
  });

  for (const order of ["session first", "invoice first"] as const) {
    it(`counts the first subscription charge once (${order}) and records renewals`, async () => {
      const env = await setup("stripe");
      const sale = await buyProduct(env, "subscription");
      const form = new URLSearchParams(calls[0]!.body);
      expect(form.get("mode")).toBe("subscription");
      expect(form.get("allow_promotion_codes")).toBeNull();
      expect(form.get("subscription_data[metadata][courselit_checkout_id]")).toBe(
        sale.checkoutId,
      );
      expect(form.get("subscription_data[metadata][courselit_school_id]")).toBe(
        env.world.schoolA.publicId,
      );

      const session = stripeEvent(
        "checkout.session.completed",
        stripeSession(sale.metadata, AMOUNTS.subscription, {
          subscription: "sub_1",
          invoice: "in_1",
        }),
      );
      const firstInvoice = stripeEvent(
        "invoice.paid",
        stripeInvoice(sale.metadata, {
          id: "in_1",
          paymentIntent: "pi_1",
          subscription: "sub_1",
          amount: AMOUNTS.subscription,
          reason: "subscription_create",
        }),
      );
      for (const event of order === "session first"
        ? [session, firstInvoice]
        : [firstInvoice, session]) {
        expectProcessed(await env.deliver(event));
      }
      let state = await productState(env, sale.productId);
      expect(state.payments).toHaveLength(1);
      expect(state.paidInvoices).toHaveLength(1);
      expect(state.paidInvoices[0]?.providerInvoiceId).toBe("in_1");
      expect(state.membership).toMatchObject({
        status: "active",
        subscriptionId: "sub_1",
      });

      // Renewal: found through the subscription's metadata.
      expectProcessed(
        await env.deliver(
          stripeEvent(
            "invoice.paid",
            stripeInvoice(sale.metadata, {
              id: "in_2",
              paymentIntent: "pi_2",
              subscription: "sub_1",
              amount: AMOUNTS.subscription,
              reason: "subscription_cycle",
            }),
          ),
        ),
      );
      // Renewal on API 2025-03-31+ (metadata under `parent`).
      expectProcessed(
        await env.deliver(
          stripeEvent(
            "invoice.paid",
            stripeInvoice(sale.metadata, {
              id: "in_3",
              paymentIntent: "pi_3",
              subscription: "sub_1",
              amount: AMOUNTS.subscription,
              reason: "subscription_cycle",
              basil: true,
            }),
          ),
        ),
      );
      state = await productState(env, sale.productId);
      expect(state.payments).toHaveLength(3);
      expect(state.paidInvoices).toHaveLength(3);
      expect(state.subscriptions).toHaveLength(1);
      await env.runtime.close();
    });
  }

  it("refunds the first subscription charge found through its invoice", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "subscription");
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "checkout.session.completed",
          stripeSession(sale.metadata, AMOUNTS.subscription, {
            subscription: "sub_r",
            invoice: "in_r1",
          }),
        ),
      ),
    );
    const refund = stripeEvent(
      "charge.refunded",
      stripeCharge({
        paymentIntent: "pi_r1",
        invoice: "in_r1",
        amount: AMOUNTS.subscription,
      }),
    );
    expectProcessed(await env.deliver(refund));
    const state = await productState(env, sale.productId);
    expect(state.payments[0]?.status).toBe("refunded");
    expect(state.invoices[0]?.status).toBe("refunded");
    expect(state.membership?.status).toBe("expired");
    expect(state.subscription?.status).toBe("cancelled");
    // The refund stops the subscription at the provider exactly once.
    expect(
      subscriptionCancelCalls().map((call) => `${call.method} ${call.url}`),
    ).toEqual(["DELETE https://api.stripe.com/v1/subscriptions/sub_r"]);
    // The provider then reports the deletion; nothing else changes.
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "customer.subscription.deleted",
          stripeSubscription(sale.metadata, "sub_r", "canceled"),
        ),
      ),
    );
    expect(subscriptionCancelCalls()).toHaveLength(1);
    await env.runtime.close();
  });

  it("refunds the first subscription charge on API 2025-03-31, where the charge names no invoice", async () => {
    // From API version 2025-03-31 a charge no longer links to its invoice and
    // carries no metadata: only the payment intent ties the refund to the
    // first payment, which the checkout session reported without one.
    const env = await setup("stripe");
    const sale = await buyProduct(env, "subscription");
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "checkout.session.completed",
          stripeSession(sale.metadata, AMOUNTS.subscription, {
            subscription: "sub_basil",
            invoice: "in_basil1",
          }),
        ),
      ),
    );
    expect(calls.map((call) => call.url)).toContain(
      "https://api.stripe.com/v1/invoice_payments?invoice=in_basil1&limit=10",
    );
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "charge.refunded",
          stripeCharge({ paymentIntent: "pi_basil1", invoice: null, amount: AMOUNTS.subscription }),
        ),
      ),
    );
    const state = await productState(env, sale.productId);
    expect(state.payments[0]?.status).toBe("refunded");
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  it("refunds a renewal charge and records partial refunds", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "subscription");
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(sale.metadata, AMOUNTS.subscription, {
          subscription: "sub_rr",
          invoice: "in_rr1",
        }),
      ),
    );
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(sale.metadata, {
          id: "in_rr2",
          paymentIntent: "pi_rr2",
          subscription: "sub_rr",
          amount: AMOUNTS.subscription,
          reason: "subscription_cycle",
        }),
      ),
    );
    expectProcessed(
      await env.deliver(
        stripeEvent("charge.refunded", {
          ...stripeCharge({ paymentIntent: "pi_rr2", invoice: "in_rr2", amount: 1000 }),
          amount_refunded: 200,
          refunded: false,
        }),
      ),
    );
    let partial = await productState(env, sale.productId);
    expect(partial.membership?.status).toBe("active");
    expect(
      partial.payments.find((payment) => payment.providerPaymentId === "pi_rr2"),
    ).toMatchObject({ status: "succeeded", refundedAmountMinor: 200 });
    // An older event arriving late never lowers the refunded total.
    expectProcessed(
      await env.deliver({
        ...stripeEvent("charge.refunded", {
          ...stripeCharge({ paymentIntent: "pi_rr2", invoice: "in_rr2", amount: 1000 }),
          amount_refunded: 100,
          refunded: false,
        }),
        id: "evt_partial_late",
      }),
    );
    partial = await productState(env, sale.productId);
    expect(
      partial.payments.find((payment) => payment.providerPaymentId === "pi_rr2")
        ?.refundedAmountMinor,
    ).toBe(200);
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "charge.refunded",
          stripeCharge({ paymentIntent: "pi_rr2", invoice: "in_rr2", amount: 1000 }),
        ),
      ),
    );
    const state = await productState(env, sale.productId);
    const renewal = state.payments.find(
      (payment) => payment.providerPaymentId === "pi_rr2",
    );
    expect(renewal?.status).toBe("refunded");
    expect(renewal?.refundedAmountMinor).toBe(AMOUNTS.subscription);
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  it("charges an installment plan exactly three times and keeps access afterwards", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "installment");
    expect(
      new URLSearchParams(calls[0]!.body).get(
        "subscription_data[metadata][courselit_installment_count]",
      ),
    ).toBe("3");
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(sale.metadata, AMOUNTS.installment, {
          subscription: "sub_emi",
          invoice: "in_e1",
        }),
      ),
    );
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(sale.metadata, {
          id: "in_e1",
          paymentIntent: "pi_e1",
          subscription: "sub_emi",
          amount: AMOUNTS.installment,
          reason: "subscription_create",
        }),
      ),
    );
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(sale.metadata, {
          id: "in_e2",
          paymentIntent: "pi_e2",
          subscription: "sub_emi",
          amount: AMOUNTS.installment,
          reason: "subscription_cycle",
        }),
      ),
    );
    expect((await productState(env, sale.productId)).paidInvoices).toHaveLength(2);
    expect(subscriptionCancelCalls()).toHaveLength(0);
    const third = stripeEvent(
      "invoice.paid",
      stripeInvoice(sale.metadata, {
        id: "in_e3",
        paymentIntent: "pi_e3",
        subscription: "sub_emi",
        amount: AMOUNTS.installment,
        reason: "subscription_cycle",
      }),
    );
    expectProcessed(await env.deliver(third));
    // Same charge through `invoice.payment_succeeded`-style redelivery.
    expectProcessed(await env.deliver({ ...third, id: "evt_third_again" }));
    expect(
      subscriptionCancelCalls().map((call) => `${call.method} ${call.url}`),
    ).toEqual(["DELETE https://api.stripe.com/v1/subscriptions/sub_emi"]);
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "customer.subscription.deleted",
          stripeSubscription(sale.metadata, "sub_emi", "canceled"),
        ),
      ),
    );
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(3);
    expect(state.paidInvoices).toHaveLength(3);
    expect(state.membership?.status).toBe("active");
    const listed = await dispatch(env.runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: sale.learner.headers,
    });
    expect((listed.body as { items: unknown[] }).items[0]).toMatchObject({
      subscription: {
        planKind: "installment",
        status: "completed",
        installmentCount: 3,
        installmentsPaid: 3,
        learnerCanCancel: false,
      },
    });
    await env.runtime.close();
  });

  it("revokes on past_due and deleted subscriptions", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "subscription");
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(sale.metadata, AMOUNTS.subscription, {
          subscription: "sub_pd",
          invoice: "in_pd1",
        }),
      ),
    );
    expectProcessed(
      await env.deliver(
        stripeEvent(
          "customer.subscription.updated",
          stripeSubscription(sale.metadata, "sub_pd", "past_due"),
        ),
      ),
    );
    let state = await productState(env, sale.productId);
    expect(state.subscription?.status).toBe("past_due");
    expect(state.membership?.status).toBe("payment_failed");

    // The retried invoice succeeds: access comes back.
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(sale.metadata, {
          id: "in_pd2",
          paymentIntent: "pi_pd2",
          subscription: "sub_pd",
          amount: AMOUNTS.subscription,
          reason: "subscription_cycle",
        }),
      ),
    );
    await env.deliver(
      stripeEvent(
        "customer.subscription.updated",
        stripeSubscription(sale.metadata, "sub_pd", "active"),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("active");
    expect(state.subscription?.status).toBe("active");

    expectProcessed(
      await env.deliver(
        stripeEvent(
          "customer.subscription.deleted",
          stripeSubscription(sale.metadata, "sub_pd", "canceled"),
        ),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.subscription?.status).toBe("cancelled");
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });
});

describe.serial("payment webhooks: Lemon Squeezy products", () => {
  it("records a one-time order once", async () => {
    const env = await setup("lemonsqueezy");
    const sale = await buyProduct(env, "one_time");
    const order = lemonEvent("order_created", sale.metadata, {
      type: "orders",
      id: "1001",
      attributes: {
        status: "paid",
        total: AMOUNTS.one_time,
        currency: "USD",
        refunded: false,
      },
    });
    expectProcessed(await env.deliver(order));
    expect(await env.deliver(order)).toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
    let state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(1);
    expect(state.paidInvoices).toHaveLength(1);
    expect(state.membership?.status).toBe("active");
    expectProcessed(
      await env.deliver(
        lemonEvent("order_refunded", sale.metadata, {
          type: "orders",
          id: "1001",
          attributes: {
            status: "partial_refund",
            total: AMOUNTS.one_time,
            refunded_amount: 500,
            currency: "USD",
            refunded: false,
          },
        }),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.payments[0]).toMatchObject({
      status: "succeeded",
      refundedAmountMinor: 500,
    });
    expect(state.membership?.status).toBe("active");
    expectProcessed(
      await env.deliver(
        lemonEvent("order_refunded", sale.metadata, {
          type: "orders",
          id: "1001",
          attributes: {
            status: "refunded",
            total: AMOUNTS.one_time,
            currency: "USD",
            refunded: true,
          },
        }),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.payments[0]?.status).toBe("refunded");
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  for (const order of ["order first", "invoice first"] as const) {
    it(`counts the first subscription charge once (${order}), records renewals and refunds`, async () => {
      const env = await setup("lemonsqueezy");
      const sale = await buyProduct(env, "subscription");
      const orderCreated = lemonEvent("order_created", sale.metadata, {
        type: "orders",
        id: "2001",
        attributes: { status: "paid", total: AMOUNTS.subscription, currency: "USD" },
      });
      const subscriptionCreated = lemonEvent("subscription_created", sale.metadata, {
        type: "subscriptions",
        id: "301",
        attributes: {
          order_id: 2001,
          status: "active",
          cancelled: false,
          renews_at: PERIOD_END.toISOString(),
          ends_at: null,
        },
      });
      const initialInvoice = lemonEvent("subscription_payment_success", sale.metadata, {
        type: "subscription-invoices",
        id: "4001",
        attributes: {
          subscription_id: 301,
          billing_reason: "initial",
          status: "paid",
          total: AMOUNTS.subscription,
          currency: "USD",
        },
      });
      const sequence =
        order === "order first"
          ? [orderCreated, subscriptionCreated, initialInvoice]
          : [initialInvoice, subscriptionCreated, orderCreated];
      for (const event of sequence) expectProcessed(await env.deliver(event));
      let state = await productState(env, sale.productId);
      expect(state.payments).toHaveLength(1);
      expect(state.paidInvoices).toHaveLength(1);
      expect(state.membership).toMatchObject({
        status: "active",
        subscriptionId: "301",
      });
      expect(state.subscription?.providerSubscriptionId).toBe("301");

      expectProcessed(
        await env.deliver(
          lemonEvent("subscription_payment_success", sale.metadata, {
            type: "subscription-invoices",
            id: "4002",
            attributes: {
              subscription_id: 301,
              billing_reason: "renewal",
              status: "paid",
              total: AMOUNTS.subscription,
              currency: "USD",
            },
          }),
        ),
      );
      state = await productState(env, sale.productId);
      expect(state.payments).toHaveLength(2);
      expect(state.paidInvoices).toHaveLength(2);

      // Refunding the initial charge through its subscription invoice.
      expectProcessed(
        await env.deliver(
          lemonEvent("subscription_payment_refunded", sale.metadata, {
            type: "subscription-invoices",
            id: "4001",
            attributes: {
              subscription_id: 301,
              billing_reason: "initial",
              status: "refunded",
              refunded: true,
              total: AMOUNTS.subscription,
              currency: "USD",
            },
          }),
        ),
      );
      state = await productState(env, sale.productId);
      expect(
        state.payments.find((payment) => payment.providerPaymentId === "2001")?.status,
      ).toBe("refunded");
      expect(state.membership?.status).toBe("expired");
      await env.runtime.close();
    });
  }

  it("keeps access after subscription_cancelled until subscription_expired", async () => {
    const env = await setup("lemonsqueezy");
    const sale = await buyProduct(env, "subscription");
    await env.deliver(
      lemonEvent("order_created", sale.metadata, {
        type: "orders",
        id: "5001",
        attributes: { status: "paid", total: AMOUNTS.subscription, currency: "USD" },
      }),
    );
    await env.deliver(
      lemonEvent("subscription_created", sale.metadata, {
        type: "subscriptions",
        id: "501",
        attributes: {
          order_id: 5001,
          status: "active",
          cancelled: false,
          renews_at: PERIOD_END.toISOString(),
        },
      }),
    );
    expectProcessed(
      await env.deliver(
        lemonEvent("subscription_cancelled", sale.metadata, {
          type: "subscriptions",
          id: "501",
          attributes: {
            order_id: 5001,
            status: "cancelled",
            cancelled: true,
            renews_at: PERIOD_END.toISOString(),
            ends_at: PERIOD_END.toISOString(),
          },
        }),
      ),
    );
    let state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("active");
    const listed = await dispatch(env.runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: sale.learner.headers,
    });
    expect((listed.body as { items: unknown[] }).items[0]).toMatchObject({
      subscription: { status: "cancelling", accessUntil: PERIOD_END.toISOString() },
    });
    expectProcessed(
      await env.deliver(
        lemonEvent("subscription_expired", sale.metadata, {
          type: "subscriptions",
          id: "501",
          attributes: {
            order_id: 5001,
            status: "expired",
            cancelled: true,
            ends_at: PERIOD_END.toISOString(),
          },
        }),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("expired");
    expect(state.subscription?.status).toBe("expired");
    await env.runtime.close();
  });

  it("charges an installment plan three times and keeps access after it ends", async () => {
    const env = await setup("lemonsqueezy");
    const sale = await buyProduct(env, "installment");
    await env.deliver(
      lemonEvent("order_created", sale.metadata, {
        type: "orders",
        id: "6001",
        attributes: { status: "paid", total: AMOUNTS.installment, currency: "USD" },
      }),
    );
    await env.deliver(
      lemonEvent("subscription_created", sale.metadata, {
        type: "subscriptions",
        id: "601",
        attributes: { order_id: 6001, status: "active", cancelled: false },
      }),
    );
    await env.deliver(
      lemonEvent("subscription_payment_success", sale.metadata, {
        type: "subscription-invoices",
        id: "7001",
        attributes: {
          subscription_id: 601,
          billing_reason: "initial",
          total: AMOUNTS.installment,
          currency: "USD",
        },
      }),
    );
    await env.deliver(
      lemonEvent("subscription_payment_success", sale.metadata, {
        type: "subscription-invoices",
        id: "7002",
        attributes: {
          subscription_id: 601,
          billing_reason: "renewal",
          total: AMOUNTS.installment,
          currency: "USD",
        },
      }),
    );
    expect(subscriptionCancelCalls()).toHaveLength(0);
    await env.deliver(
      lemonEvent("subscription_payment_success", sale.metadata, {
        type: "subscription-invoices",
        id: "7003",
        attributes: {
          subscription_id: 601,
          billing_reason: "renewal",
          total: AMOUNTS.installment,
          currency: "USD",
        },
      }),
    );
    expect(
      subscriptionCancelCalls().map((call) => `${call.method} ${call.url}`),
    ).toEqual(["DELETE https://api.lemonsqueezy.com/v1/subscriptions/601"]);
    await env.deliver(
      lemonEvent("subscription_cancelled", sale.metadata, {
        type: "subscriptions",
        id: "601",
        attributes: {
          order_id: 6001,
          status: "cancelled",
          cancelled: true,
          ends_at: PERIOD_END.toISOString(),
        },
      }),
    );
    await env.deliver(
      lemonEvent("subscription_expired", sale.metadata, {
        type: "subscriptions",
        id: "601",
        attributes: {
          order_id: 6001,
          status: "expired",
          cancelled: true,
          ends_at: PERIOD_END.toISOString(),
        },
      }),
    );
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(3);
    expect(state.paidInvoices).toHaveLength(3);
    expect(state.membership?.status).toBe("active");
    await env.runtime.close();
  });
});

describe.serial("payment webhooks: Razorpay products", () => {
  it("records a one-time order once and ignores payment.captured", async () => {
    const env = await setup("razorpay");
    const sale = await buyProduct(env, "one_time");
    const payment = {
      id: "pay_once",
      entity: "payment",
      amount: AMOUNTS.one_time,
      currency: "USD",
      status: "captured",
      order_id: sale.razorpayId,
      invoice_id: null,
      notes: [],
    };
    expectProcessed(
      await env.deliver({
        entity: "event",
        event: "payment.captured",
        payload: { payment: { entity: payment } },
      }),
    );
    const paid = {
      entity: "event",
      event: "order.paid",
      payload: {
        payment: { entity: payment },
        order: {
          entity: {
            id: sale.razorpayId,
            entity: "order",
            amount: AMOUNTS.one_time,
            amount_paid: AMOUNTS.one_time,
            currency: "USD",
            status: "paid",
            notes: sale.metadata,
          },
        },
      },
    };
    expectProcessed(await env.deliver(paid, "evt_order_paid"));
    expect(await env.deliver(paid, "evt_order_paid")).toMatchObject({
      status: 200,
      body: { duplicate: true },
    });
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(1);
    expect(state.paidInvoices).toHaveLength(1);
    expect(state.membership?.status).toBe("active");
    await env.runtime.close();
  });

  function charged(
    metadata: Record<string, string>,
    subscriptionId: string,
    paymentId: string,
    amount: number,
    subscription: Record<string, unknown> = {},
  ) {
    return {
      entity: "event",
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: subscriptionId,
            entity: "subscription",
            status: "active",
            current_end: PERIOD_END_SECONDS,
            notes: metadata,
            ...subscription,
          },
        },
        payment: {
          entity: {
            id: paymentId,
            entity: "payment",
            amount,
            currency: "USD",
            status: "captured",
            invoice_id: `inv_${paymentId}`,
          },
        },
      },
    };
  }

  it("counts each subscription.charged once, including the first, and refunds", async () => {
    const env = await setup("razorpay");
    const sale = await buyProduct(env, "subscription");
    const first = charged(
      sale.metadata,
      sale.razorpayId!,
      "pay_s1",
      AMOUNTS.subscription,
      {
        paid_count: 1,
        remaining_count: 119,
      },
    );
    expectProcessed(await env.deliver(first, "evt_s1"));
    expect(await env.deliver(first, "evt_s1")).toMatchObject({
      body: { duplicate: true },
    });
    expectProcessed(
      await env.deliver(
        charged(sale.metadata, sale.razorpayId!, "pay_s2", AMOUNTS.subscription, {
          paid_count: 2,
          remaining_count: 118,
        }),
      ),
    );
    let state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(2);
    expect(state.paidInvoices).toHaveLength(2);
    expect(state.membership).toMatchObject({
      status: "active",
      subscriptionId: sale.razorpayId,
    });

    expectProcessed(
      await env.deliver({
        entity: "event",
        event: "refund.processed",
        payload: {
          refund: {
            entity: { id: "rfnd_0", entity: "refund", payment_id: "pay_s1", amount: 300 },
          },
          payment: {
            entity: {
              id: "pay_s1",
              entity: "payment",
              amount: AMOUNTS.subscription,
              amount_refunded: 300,
              currency: "USD",
              refund_status: "partial",
            },
          },
        },
      }),
    );
    state = await productState(env, sale.productId);
    expect(
      state.payments.find((payment) => payment.providerPaymentId === "pay_s1"),
    ).toMatchObject({ status: "succeeded", refundedAmountMinor: 300 });
    expect(state.membership?.status).toBe("active");

    // The second refund returns the rest: the payment is now fully refunded
    // even though this refund alone is smaller than the payment.
    expectProcessed(
      await env.deliver({
        entity: "event",
        event: "refund.processed",
        payload: {
          refund: {
            entity: {
              id: "rfnd_1",
              entity: "refund",
              payment_id: "pay_s1",
              amount: AMOUNTS.subscription - 300,
            },
          },
          payment: {
            entity: {
              id: "pay_s1",
              entity: "payment",
              amount: AMOUNTS.subscription,
              amount_refunded: AMOUNTS.subscription,
              currency: "USD",
              refund_status: "partial",
            },
          },
        },
      }),
    );
    state = await productState(env, sale.productId);
    expect(
      state.payments.find((payment) => payment.providerPaymentId === "pay_s1")?.status,
    ).toBe("refunded");
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  it("charges an installment plan three times and keeps access when Razorpay completes it", async () => {
    const env = await setup("razorpay");
    const sale = await buyProduct(env, "installment");
    const created = calls.find(
      (call) => call.url === "https://api.razorpay.com/v1/subscriptions",
    );
    expect(JSON.parse(created!.body)).toMatchObject({ total_count: 3 });
    for (const [index, remaining] of [2, 1].entries()) {
      await env.deliver(
        charged(
          sale.metadata,
          sale.razorpayId!,
          `pay_e${index + 1}`,
          AMOUNTS.installment,
          {
            paid_count: index + 1,
            remaining_count: remaining,
          },
        ),
      );
    }
    expect(subscriptionCancelCalls()).toHaveLength(0);
    await env.deliver(
      charged(sale.metadata, sale.razorpayId!, "pay_e3", AMOUNTS.installment, {
        paid_count: 3,
        remaining_count: 0,
      }),
    );
    // Razorpay stops after `total_count` charges itself; no cancel needed.
    expect(subscriptionCancelCalls()).toHaveLength(0);
    expectProcessed(
      await env.deliver({
        entity: "event",
        event: "subscription.completed",
        payload: {
          subscription: {
            entity: {
              id: sale.razorpayId,
              status: "completed",
              notes: sale.metadata,
              remaining_count: 0,
            },
          },
        },
      }),
    );
    const state = await productState(env, sale.productId);
    expect(state.payments).toHaveLength(3);
    expect(state.membership?.status).toBe("active");
    expect(state.subscription?.status).toBe("expired");
    const listed = await dispatch(env.runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: sale.learner.headers,
    });
    expect((listed.body as { items: unknown[] }).items[0]).toMatchObject({
      subscription: { planKind: "installment", status: "completed" },
    });
    await env.runtime.close();
  });
});

describe.serial("payment webhooks: community checkouts", () => {
  it("counts a Stripe community subscription once, renews, and refunds the first charge", async () => {
    const env = await setup("stripe");
    const join = await joinCommunity(env, "subscription");
    expect(
      new URLSearchParams(calls[0]!.body).get(
        "subscription_data[metadata][courselit_community_checkout_id]",
      ),
    ).toBe(join.checkoutId);
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(join.metadata, {
          id: "in_c1",
          paymentIntent: "pi_c1",
          subscription: "sub_c",
          amount: AMOUNTS.subscription,
          reason: "subscription_create",
        }),
      ),
    );
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(join.metadata, AMOUNTS.subscription, {
          subscription: "sub_c",
          invoice: "in_c1",
        }),
      ),
    );
    let state = await communityState(env, join);
    expect(state.payments).toHaveLength(1);
    expect(state.paidInvoices).toHaveLength(1);
    expect(state.membership?.status).toBe("active");

    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(join.metadata, {
          id: "in_c2",
          paymentIntent: "pi_c2",
          subscription: "sub_c",
          amount: AMOUNTS.subscription,
          reason: "subscription_cycle",
        }),
      ),
    );
    state = await communityState(env, join);
    expect(state.payments).toHaveLength(2);
    expect(state.paidInvoices).toHaveLength(2);

    // A partial refund of the renewal keeps the membership.
    expectProcessed(
      await env.deliver(
        stripeEvent("charge.refunded", {
          ...stripeCharge({ paymentIntent: "pi_c2", invoice: "in_c2", amount: AMOUNTS.subscription }),
          amount_refunded: 400,
          refunded: false,
        }),
      ),
    );
    state = await communityState(env, join);
    expect(
      state.payments.find((payment) => payment.providerPaymentId === "pi_c2"),
    ).toMatchObject({ status: "succeeded", refundedAmountMinor: 400 });
    expect(state.membership?.status).toBe("active");

    expectProcessed(
      await env.deliver(
        stripeEvent(
          "charge.refunded",
          stripeCharge({
            paymentIntent: "pi_c1",
            invoice: "in_c1",
            amount: AMOUNTS.subscription,
          }),
        ),
      ),
    );
    state = await communityState(env, join);
    expect(
      state.invoices.find((invoice) => invoice.providerInvoiceId === "in_c1")?.status,
    ).toBe("refunded");
    expect(state.membership?.status).toBe("expired");
    expect(subscriptionCancelCalls()).toHaveLength(1);
    await env.runtime.close();
  });

  it("charges a Stripe community installment plan three times and keeps access", async () => {
    const env = await setup("stripe");
    const join = await joinCommunity(env, "installment");
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(join.metadata, AMOUNTS.installment, {
          subscription: "sub_ce",
          invoice: "in_ce1",
        }),
      ),
    );
    for (const [id, reason] of [
      ["in_ce1", "subscription_create"],
      ["in_ce2", "subscription_cycle"],
    ] as const) {
      await env.deliver(
        stripeEvent(
          "invoice.paid",
          stripeInvoice(join.metadata, {
            id,
            paymentIntent: `pi_${id}`,
            subscription: "sub_ce",
            amount: AMOUNTS.installment,
            reason,
          }),
        ),
      );
    }
    expect(subscriptionCancelCalls()).toHaveLength(0);
    await env.deliver(
      stripeEvent(
        "invoice.paid",
        stripeInvoice(join.metadata, {
          id: "in_ce3",
          paymentIntent: "pi_in_ce3",
          subscription: "sub_ce",
          amount: AMOUNTS.installment,
          reason: "subscription_cycle",
        }),
      ),
    );
    expect(subscriptionCancelCalls()).toHaveLength(1);
    await env.deliver(
      stripeEvent(
        "customer.subscription.deleted",
        stripeSubscription(join.metadata, "sub_ce", "canceled"),
      ),
    );
    const state = await communityState(env, join);
    expect(state.payments).toHaveLength(3);
    expect(state.paidInvoices).toHaveLength(3);
    expect(state.membership?.status).toBe("active");
    await env.runtime.close();
  });

  it("keeps Lemon Squeezy community access through subscription_cancelled until expiry", async () => {
    const env = await setup("lemonsqueezy");
    const join = await joinCommunity(env, "subscription");
    for (const event of [
      lemonEvent("subscription_payment_success", join.metadata, {
        type: "subscription-invoices",
        id: "8001",
        attributes: {
          subscription_id: 801,
          billing_reason: "initial",
          total: AMOUNTS.subscription,
          currency: "USD",
        },
      }),
      lemonEvent("order_created", join.metadata, {
        type: "orders",
        id: "9001",
        attributes: { status: "paid", total: AMOUNTS.subscription, currency: "USD" },
      }),
      lemonEvent("subscription_created", join.metadata, {
        type: "subscriptions",
        id: "801",
        attributes: {
          order_id: 9001,
          status: "active",
          cancelled: false,
          renews_at: PERIOD_END.toISOString(),
        },
      }),
    ]) {
      expectProcessed(await env.deliver(event));
    }
    let state = await communityState(env, join);
    expect(state.payments).toHaveLength(1);
    expect(state.membership).toMatchObject({ status: "active", subscriptionId: "801" });
    await env.deliver(
      lemonEvent("subscription_cancelled", join.metadata, {
        type: "subscriptions",
        id: "801",
        attributes: {
          order_id: 9001,
          status: "cancelled",
          cancelled: true,
          ends_at: PERIOD_END.toISOString(),
        },
      }),
    );
    state = await communityState(env, join);
    expect(state.membership?.status).toBe("active");
    expect(state.subscription?.cancelAt?.toISOString()).toBe(PERIOD_END.toISOString());
    await env.deliver(
      lemonEvent("subscription_expired", join.metadata, {
        type: "subscriptions",
        id: "801",
        attributes: {
          order_id: 9001,
          status: "expired",
          cancelled: true,
          ends_at: PERIOD_END.toISOString(),
        },
      }),
    );
    state = await communityState(env, join);
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });
});

async function paidStripeSubscription(
  env: Env,
  kind: "subscription" | "installment",
  email?: string,
) {
  const sale = await buyProduct(env, kind, email);
  const subscriptionId = `sub_${sale.checkoutId}`;
  await env.deliver(
    stripeEvent(
      "checkout.session.completed",
      stripeSession(sale.metadata, AMOUNTS[kind], {
        subscription: subscriptionId,
        invoice: `in_${sale.checkoutId}`,
      }),
    ),
  );
  expect((await productState(env, sale.productId)).membership?.status).toBe("active");
  return { ...sale, subscriptionId };
}

describe.serial("buying again after a refund", () => {
  it("doesn't describe a one-time purchase with the refunded subscription", async () => {
    const env = await setup("stripe");
    const sale = await paidStripeSubscription(env, "subscription");
    await env.deliver(
      stripeEvent(
        "charge.refunded",
        stripeCharge({
          paymentIntent: `pi_${sale.checkoutId}`,
          invoice: null,
          amount: AMOUNTS.subscription,
        }),
      ),
    );
    expect((await productState(env, sale.productId)).membership?.status).not.toBe("active");

    const plan = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/products/${sale.productId}/plans`,
      headers: env.admin,
      body: PLANS.one_time,
    });
    const rebuy = await dispatch(env.runtime, {
      method: "POST",
      path: "/v1/learner/checkout",
      headers: { ...sale.learner.headers, "idempotency-key": "rebuy-one-time" },
      body: {
        planId: (plan.body as { id: string }).id,
        returnUrl: "http://localhost:3000/checkout/complete",
      },
    });
    expect(rebuy.status).toBe(201);
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(checkoutMetadata(env), AMOUNTS.one_time, null, "pi_rebuy"),
      ),
    );

    const listed = await dispatch(env.runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: sale.learner.headers,
    });
    expect((listed.body as { items: unknown[] }).items[0]).toMatchObject({
      subscription: null,
    });
    await env.runtime.close();
  });
});

describe.serial("subscription cancellation", () => {
  it("lets a learner stop renewing and keeps access until the provider ends it", async () => {
    const env = await setup("stripe");
    const sale = await paidStripeSubscription(env, "subscription");
    const listedBefore = await dispatch(env.runtime, {
      method: "GET",
      path: "/v1/learner/products",
      headers: sale.learner.headers,
    });
    expect((listedBefore.body as { items: unknown[] }).items[0]).toMatchObject({
      subscription: {
        planKind: "subscription",
        status: "active",
        learnerCanCancel: true,
      },
    });

    // Another learner cannot cancel it: they have no such subscription.
    const stranger = await env.signUp("stranger@example.com");
    const forbidden = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/learner/products/${sale.productId}/subscription/cancel`,
      headers: stranger.headers,
      body: {},
    });
    expect(forbidden.status).toBe(404);
    expect(subscriptionCancelCalls()).toHaveLength(0);

    const cancelled = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/learner/products/${sale.productId}/subscription/cancel`,
      headers: sale.learner.headers,
      body: {},
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({
      status: "cancelling",
      accessUntil: PERIOD_END.toISOString(),
      learnerCanCancel: false,
    });
    const [call] = subscriptionCancelCalls();
    expect(call).toMatchObject({
      method: "POST",
      url: `https://api.stripe.com/v1/subscriptions/${sale.subscriptionId}`,
    });
    expect(new URLSearchParams(call!.body).get("cancel_at_period_end")).toBe("true");
    const audit = await env.runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "storefront_subscription.cancel_requested"));
    expect(audit).toHaveLength(1);

    // Cancelling twice is idempotent.
    const again = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/learner/products/${sale.productId}/subscription/cancel`,
      headers: sale.learner.headers,
      body: {},
    });
    expect(again.status).toBe(200);
    expect(subscriptionCancelCalls()).toHaveLength(1);

    // Stripe confirms the scheduled cancellation; access continues.
    await env.deliver(
      stripeEvent(
        "customer.subscription.updated",
        stripeSubscription(sale.metadata, sale.subscriptionId, "active", {
          cancel_at_period_end: true,
          cancel_at: PERIOD_END_SECONDS,
        }),
      ),
    );
    let state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("active");
    expect(state.subscription).toMatchObject({
      status: "active",
      cancelAtPeriodEnd: true,
    });

    // At the end of the period Stripe deletes the subscription.
    await env.deliver(
      stripeEvent(
        "customer.subscription.deleted",
        stripeSubscription(sale.metadata, sale.subscriptionId, "canceled"),
      ),
    );
    state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("expired");
    await env.runtime.close();
  });

  it("does not let a learner cancel the remaining installments", async () => {
    const env = await setup("stripe");
    const sale = await paidStripeSubscription(env, "installment");
    const response = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/learner/products/${sale.productId}/subscription/cancel`,
      headers: sale.learner.headers,
      body: {},
    });
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      details: { reason: "installment_plan_not_cancellable" },
    });
    expect(subscriptionCancelCalls()).toHaveLength(0);
    await env.runtime.close();
  });

  it("cancels at the end of the cycle on Lemon Squeezy and Razorpay", async () => {
    const lemon = await setup("lemonsqueezy");
    const lemonSale = await buyProduct(lemon, "subscription");
    await lemon.deliver(
      lemonEvent("order_created", lemonSale.metadata, {
        type: "orders",
        id: "1101",
        attributes: { status: "paid", total: AMOUNTS.subscription, currency: "USD" },
      }),
    );
    await lemon.deliver(
      lemonEvent("subscription_created", lemonSale.metadata, {
        type: "subscriptions",
        id: "1201",
        attributes: { order_id: 1101, status: "active", cancelled: false },
      }),
    );
    const lemonCancel = await dispatch(lemon.runtime, {
      method: "POST",
      path: `/v1/learner/products/${lemonSale.productId}/subscription/cancel`,
      headers: lemonSale.learner.headers,
      body: {},
    });
    expect(lemonCancel.body).toMatchObject({
      status: "cancelling",
      accessUntil: PERIOD_END.toISOString(),
    });
    expect(
      subscriptionCancelCalls().map((call) => `${call.method} ${call.url}`),
    ).toEqual(["DELETE https://api.lemonsqueezy.com/v1/subscriptions/1201"]);
    await lemon.runtime.close();

    calls = [];
    const razorpay = await setup("razorpay");
    const razorpaySale = await buyProduct(razorpay, "subscription");
    await razorpay.deliver(
      {
        entity: "event",
        event: "subscription.charged",
        payload: {
          subscription: {
            entity: {
              id: razorpaySale.razorpayId,
              status: "active",
              notes: razorpaySale.metadata,
            },
          },
          payment: {
            entity: { id: "pay_c1", amount: AMOUNTS.subscription, currency: "USD" },
          },
        },
      },
      "evt_rzp_cancel",
    );
    const razorpayCancel = await dispatch(razorpay.runtime, {
      method: "POST",
      path: `/v1/learner/products/${razorpaySale.productId}/subscription/cancel`,
      headers: razorpaySale.learner.headers,
      body: {},
    });
    expect(razorpayCancel.body).toMatchObject({ status: "cancelling" });
    const [razorpayCall] = subscriptionCancelCalls();
    expect(razorpayCall?.url).toBe(
      `https://api.razorpay.com/v1/subscriptions/${razorpaySale.razorpayId}/cancel`,
    );
    expect(JSON.parse(razorpayCall!.body)).toEqual({ cancel_at_cycle_end: 1 });
    await razorpay.runtime.close();
    // Sets up a Lemon Squeezy and a Razorpay school, so it outlasts the default.
  }, 30_000);

  it("lets a creator cancel at period end or remove access, with product permission", async () => {
    const env = await setup("stripe");
    const sale = await paidStripeSubscription(env, "subscription");
    const customerId = sale.learner.account.publicId;

    // A staff member who can only read products may not change access.
    const [memberAccount] = await env.runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(
        and(
          eq(schema.schoolAccounts.schoolId, env.world.schoolA.id),
          eq(schema.schoolAccounts.email, env.world.member.email),
        ),
      );
    await env.runtime.db
      .update(schema.memberships)
      .set({ permissions: ["products:read"], presetId: null, version: 2 })
      .where(eq(schema.memberships.schoolAccountId, memberAccount!.id));
    const memberHeaders = {
      cookie: env.world.member.sessionCookie,
      "x-school-id": env.world.schoolA.publicId,
    };
    for (const action of ["subscription/cancel", "remove-access"]) {
      const denied = await dispatch(env.runtime, {
        method: "POST",
        path: `/v1/products/${sale.productId}/customers/${customerId}/${action}`,
        headers: memberHeaders,
        body: {},
      });
      expect(denied.status).toBe(403);
    }
    expect(subscriptionCancelCalls()).toHaveLength(0);

    const customers = await dispatch(env.runtime, {
      method: "GET",
      path: `/v1/products/${sale.productId}/customers`,
      headers: env.admin,
    });
    expect((customers.body as { items: unknown[] }).items[0]).toMatchObject({
      id: customerId,
      subscription: { planKind: "subscription", status: "active" },
    });

    const cancelled = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/products/${sale.productId}/customers/${customerId}/subscription/cancel`,
      headers: env.admin,
      body: {},
    });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ status: "cancelling" });
    expect(subscriptionCancelCalls()[0]).toMatchObject({ method: "POST" });
    expect((await productState(env, sale.productId)).membership?.status).toBe("active");

    const removed = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/products/${sale.productId}/customers/${customerId}/remove-access`,
      headers: env.admin,
      body: {},
    });
    expect(removed.status).toBe(200);
    expect(removed.body).toMatchObject({
      customerId,
      membershipStatus: "expired",
      subscription: { status: "cancelled" },
    });
    expect(subscriptionCancelCalls()[1]).toMatchObject({
      method: "DELETE",
      url: `https://api.stripe.com/v1/subscriptions/${sale.subscriptionId}`,
    });
    const state = await productState(env, sale.productId);
    expect(state.membership?.status).toBe("expired");
    expect(state.subscription?.status).toBe("cancelled");
    const audit = await env.runtime.db
      .select()
      .from(schema.auditEvents)
      .where(eq(schema.auditEvents.action, "product_customer.access_removed"));
    expect(audit).toHaveLength(1);

    const repeat = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/products/${sale.productId}/customers/${customerId}/remove-access`,
      headers: env.admin,
      body: {},
    });
    expect(repeat.status).toBe(409);

    // One-time purchases can be removed too, without any provider call.
    const oneTime = await buyProduct(env, "one_time", "one-time-removal@example.com");
    await env.deliver(
      stripeEvent(
        "checkout.session.completed",
        stripeSession(oneTime.metadata, AMOUNTS.one_time, null, "pi_removal"),
      ),
    );
    const callsBefore = subscriptionCancelCalls().length;
    const removedOneTime = await dispatch(env.runtime, {
      method: "POST",
      path: `/v1/products/${oneTime.productId}/customers/${oneTime.learner.account.publicId}/remove-access`,
      headers: env.admin,
      body: {},
    });
    expect(removedOneTime.status).toBe(200);
    expect(removedOneTime.body).toMatchObject({ subscription: null });
    expect(subscriptionCancelCalls()).toHaveLength(callsBefore);
    expect((await productState(env, oneTime.productId)).membership?.status).toBe(
      "expired",
    );
    await env.runtime.close();
  });
});

describe.serial("checkouts the provider refuses", () => {
  it("leaves no failed customer behind and tells the team once", async () => {
    const env = await setup("stripe");
    const sale = await buyProduct(env, "one_time", "first@example.com");

    refuseCheckouts = true;
    const tryToBuy = async (email: string) => {
      const learner = await env.signUp(email);
      return dispatch(env.runtime, {
        method: "POST",
        path: "/v1/learner/checkout",
        headers: { ...learner.headers, "idempotency-key": `refused-${email}` },
        body: { planId: sale.planId, returnUrl: "http://localhost:3000/checkout/complete" },
      });
    };
    const refused = await tryToBuy("refused@example.com");
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({ details: { reason: "checkout_refused" } });
    expect(await tryToBuy("refused-again@example.com")).toMatchObject({ status: 409 });

    // Neither learner paid, so neither is on the product's customer list.
    const memberships = await env.runtime.db
      .select()
      .from(schema.learnerMemberships)
      .where(eq(schema.learnerMemberships.entityId, sale.productId));
    expect(memberships.map((membership) => membership.schoolAccountId)).toEqual([
      sale.learner.account.id,
    ]);
    // The owner hears about it once, not once per learner.
    const alerts = await env.runtime.db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.type, "checkout_refused"));
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      title: "Stripe refused a checkout",
      href: "/settings/payment",
    });

    refuseCheckouts = false;
    expect((await tryToBuy("later@example.com")).status).toBe(201);
    await env.runtime.close();
  });
});

describe.serial("contact deletion", () => {
  it("cancels product subscriptions with the provider before deleting a contact", async () => {
    const env = await setup("stripe");
    const sale = await paidStripeSubscription(env, "subscription");
    const contactId = sale.learner.account.publicId;

    // Provider down: nothing changes and the creator is told why.
    failSubscriptionCalls = true;
    const failed = await dispatch(env.runtime, {
      method: "DELETE",
      path: `/v1/contacts/${contactId}`,
      headers: env.admin,
      body: {},
    });
    expect(failed.status).toBe(409);
    expect(failed.body).toMatchObject({ details: { reason: "provider_unavailable" } });
    let state = await productState(env, sale.productId);
    expect(state.subscription?.status).toBe("active");
    const [unchanged] = await env.runtime.db
      .select()
      .from(schema.schoolAccounts)
      .where(eq(schema.schoolAccounts.id, sale.learner.account.id));
    expect(unchanged?.status).toBe("active");

    failSubscriptionCalls = false;
    calls = [];
    const deleted = await dispatch(env.runtime, {
      method: "DELETE",
      path: `/v1/contacts/${contactId}`,
      headers: env.admin,
      body: {},
    });
    expect(deleted.status).toBe(200);
    expect(
      subscriptionCancelCalls().map((call) => `${call.method} ${call.url}`),
    ).toEqual([
      `DELETE https://api.stripe.com/v1/subscriptions/${sale.subscriptionId}`,
    ]);
    state = await productState(env, sale.productId);
    expect(state.subscription?.status).toBe("cancelled");
    await env.runtime.close();
  });
});
