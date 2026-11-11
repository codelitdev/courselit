// Payment webhooks are registered on the school's own provider account when
// the creator saves their keys.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema/index.js";
import { parseStoredPaymentSettings } from "./payments.js";
import { createPgliteRuntime, freezeRuntimeClock } from "./runtime.js";
import { updateSchoolPaymentSettings } from "./schools.js";
import { seedWorld } from "./seed.js";

type Call = { method: string; url: string; body: string };

const WEBHOOK_URL_BASE = "https://school.example/api";

describe.serial("automatic payment webhooks", () => {
  const clock = freezeRuntimeClock(new Date("2026-03-01T00:00:00.000Z"));
  const originalFetch = globalThis.fetch;
  let runtime: Awaited<ReturnType<typeof createPgliteRuntime>>;
  let school: { id: string; publicId: string };
  let calls: Call[];
  let respond: (call: Call) => Response;

  beforeEach(async () => {
    process.env.INTEGRATIONS_ENCRYPTION_KEY = "test-secret-that-is-at-least-thirty-two-characters";
    process.env.PAYMENT_WEBHOOK_BASE_URL = WEBHOOK_URL_BASE;
    runtime = await createPgliteRuntime({ clock });
    school = (await seedWorld(runtime, clock)).schoolA;
    calls = [];
    globalThis.fetch = (async (input, init) => {
      const call = {
        method: init?.method ?? "GET",
        url: String(input),
        body: String(init?.body ?? ""),
      };
      calls.push(call);
      return respond(call);
    }) as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    delete process.env.PAYMENT_WEBHOOK_BASE_URL;
    await runtime.close();
  });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  const save = (settings: Parameters<typeof updateSchoolPaymentSettings>[1]["settings"]) =>
    updateSchoolPaymentSettings(
      runtime.db,
      { schoolId: school.id, actorId: "actor", settings },
      clock,
    );

  async function stored() {
    const [row] = await runtime.db
      .select({ settings: schema.schools.paymentSettingsEncrypted })
      .from(schema.schools)
      .where(eq(schema.schools.id, school.id));
    return parseStoredPaymentSettings(row!.settings);
  }

  it("registers a Stripe webhook when the secret key is saved", async () => {
    respond = (call) => {
      if (call.method === "GET") {
        return json({
          data: [
            { id: "we_old", metadata: { courselit_school_id: school.publicId } },
            { id: "we_other_app", metadata: {} },
          ],
        });
      }
      if (call.method === "POST") return json({ id: "we_new", secret: "whsec_new" });
      return json({ deleted: true });
    };

    const result = await save({ provider: "stripe", stripe: { secretKey: "sk_test_1" } });

    expect(result.ok).toBe(true);
    const created = calls.find((call) => call.method === "POST")!;
    const body = new URLSearchParams(created.body);
    expect(body.get("url")).toBe(`${WEBHOOK_URL_BASE}/v1/storefront/webhooks/stripe`);
    expect(body.get("api_version")).toBe("2025-03-31.basil");
    expect(body.get("metadata[courselit_school_id]")).toBe(school.publicId);
    expect(body.getAll("enabled_events[0]")).toEqual(["checkout.session.completed"]);
    expect(body.get("enabled_events[11]")).toBe("customer.subscription.resumed");
    // Only this school's earlier endpoint is replaced.
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.url)).toEqual([
      "https://api.stripe.com/v1/webhook_endpoints/we_old",
    ]);
    expect((await stored()).stripe?.webhookSecret).toBe("whsec_new");
    expect(result.ok && result.value.stripe.webhook).toEqual({
      url: `${WEBHOOK_URL_BASE}/v1/storefront/webhooks/stripe`,
      connected: true,
      error: null,
    });

    // Saving again without new keys leaves the connected webhook alone.
    calls = [];
    await save({ provider: "stripe", stripe: { publishableKey: "pk_test_1" } });
    expect(calls).toEqual([]);
  });

  it("keeps the keys and reports why a registration failed, then retries", async () => {
    respond = () => json({ error: { message: "Invalid API Key provided" } }, 401);
    const failed = await save({ provider: "stripe", stripe: { secretKey: "sk_test_bad" } });

    expect(failed.ok).toBe(true);
    expect((await stored()).stripe?.secretKey).toBe("sk_test_bad");
    expect(failed.ok && failed.value.stripe.webhook).toMatchObject({
      connected: false,
      error: "Stripe rejected the API key.",
    });

    respond = (call) =>
      call.method === "GET" ? json({ data: [] }) : json({ id: "we_1", secret: "whsec_1" });
    const retried = await save({ stripe: {} });
    expect(retried.ok && retried.value.stripe.webhook).toMatchObject({
      connected: true,
      error: null,
    });
  });

  it("registers a Lemon Squeezy webhook in the key's mode", async () => {
    respond = (call) => {
      if (call.url.endsWith("/users/me")) return json({ meta: { test_mode: true }, data: {} });
      if (call.method === "POST") return json({ data: { id: 150 } });
      return new Response(null, { status: 204 });
    };

    await save({
      provider: "lemonsqueezy",
      lemonsqueezy: { apiKey: "ls_key_1", storeId: "61817" },
    });
    const created = JSON.parse(calls.find((call) => call.method === "POST")!.body);
    const settings = await stored();
    expect(created.data.attributes).toMatchObject({
      url: `${WEBHOOK_URL_BASE}/v1/storefront/webhooks/lemonsqueezy`,
      test_mode: true,
      secret: settings.lemonsqueezy?.webhookSecret,
    });
    expect(created.data.attributes.secret.length).toBeLessThanOrEqual(40);
    expect(created.data.attributes.events).toContain("order_refunded");
    expect(created.data.relationships.store.data.id).toBe("61817");
    expect(settings.lemonsqueezy?.webhookEndpointId).toBe("150");

    // A new key registers a fresh webhook and removes the old one.
    respond = (call) => {
      if (call.url.endsWith("/users/me")) return json({ meta: { test_mode: false }, data: {} });
      if (call.method === "POST") return json({ data: { id: 151 } });
      return new Response(null, { status: 204 });
    };
    calls = [];
    await save({ lemonsqueezy: { apiKey: "ls_key_2" } });
    expect(calls.filter((call) => call.method === "DELETE").map((call) => call.url)).toEqual([
      "https://api.lemonsqueezy.com/v1/webhooks/150",
    ]);
  });

  it("registers a Razorpay webhook and updates it in place", async () => {
    respond = (call) => {
      if (call.method === "GET") {
        return json({ items: [{ id: "wh_qa", url: "https://elsewhere.example/hook" }] });
      }
      return json({ id: "wh_1" });
    };

    const result = await save({
      provider: "razorpay",
      razorpay: { keyId: "rzp_test", keySecret: "rzp_secret" },
    });
    const created = calls.find((call) => call.method === "POST")!;
    expect(created.url).toBe("https://api.razorpay.com/v1/webhooks");
    expect(created.body).not.toContain("payment.refunded");
    const body = JSON.parse(created.body);
    expect(body.url).toBe(`${WEBHOOK_URL_BASE}/v1/storefront/webhooks/razorpay`);
    expect(body.events["refund.processed"]).toBe(true);
    expect(body.events["subscription.charged"]).toBe(true);
    expect((await stored()).razorpay?.webhookSecret).toBe(body.secret);
    expect(result.ok && result.value.razorpay.webhook).toEqual({
      url: `${WEBHOOK_URL_BASE}/v1/storefront/webhooks/razorpay`,
      connected: true,
      error: null,
    });

    // Razorpay can't delete webhooks, so a new secret key rewrites the
    // school's webhook rather than adding another.
    respond = (call) =>
      call.method === "GET"
        ? json({ items: [{ id: "wh_1", url: body.url }] })
        : json({ id: "wh_1" });
    calls = [];
    await save({ razorpay: { keySecret: "rzp_secret_2" } });
    const updated = calls.find((call) => call.method !== "GET")!;
    expect(updated).toMatchObject({ method: "PUT", url: "https://api.razorpay.com/v1/webhooks/wh_1" });
    expect((await stored()).razorpay?.webhookSecret).toBe(JSON.parse(updated.body).secret);
  });
});
