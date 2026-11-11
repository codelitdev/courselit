import { randomBytes } from "node:crypto";
import { PAYMENT_WEBHOOK_EVENTS } from "@courselit/api-contract";
import type { PaymentProviderName, StoredPaymentSettings } from "./payments.js";

/**
 * Payment webhooks are registered on the school's own provider account when
 * the creator saves their keys, so the creator never copies URLs or secrets
 * around.
 */

export const PAYMENT_WEBHOOK_PROVIDERS = ["stripe", "lemonsqueezy", "razorpay"] as const satisfies readonly PaymentProviderName[];

const PROVIDER_LABELS: Record<PaymentProviderName, string> = {
  stripe: "Stripe",
  lemonsqueezy: "Lemon Squeezy",
  razorpay: "Razorpay",
};

/** The Stripe API version webhook payloads are pinned to. */
const STRIPE_WEBHOOK_API_VERSION = "2025-03-31.basil";

/**
 * Where providers deliver a school's payment events. One URL serves every
 * school: the school is read from the event's checkout metadata.
 * `PAYMENT_WEBHOOK_BASE_URL` overrides the default (the admin origin's API
 * proxy) where that origin isn't reachable from the internet, e.g. in
 * development behind a tunnel.
 */
export function paymentWebhookUrl(provider: PaymentProviderName): string {
  const base = (
    process.env.PAYMENT_WEBHOOK_BASE_URL ??
    `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/api`
  ).replace(/\/+$/, "");
  return `${base}/v1/storefront/webhooks/${provider}`;
}

export type RegisteredWebhook = {
  endpointId: string;
  secret: string;
  url: string;
};

export class WebhookRegistrationError extends Error {}

function failure(provider: string, status: number, detail?: string): WebhookRegistrationError {
  if (status === 401) {
    return new WebhookRegistrationError(`${provider} rejected the API key.`);
  }
  if (status === 403) {
    return new WebhookRegistrationError(
      `This ${provider} API key isn't allowed to manage webhooks. Use a key with webhook write access.`,
    );
  }
  return new WebhookRegistrationError(
    `Couldn't register the webhook with ${provider}${detail ? `: ${detail}` : ` (HTTP ${status})`}.`,
  );
}

async function errorDetail(response: Response): Promise<string | undefined> {
  const body = (await response.json().catch(() => null)) as
    | {
        error?: { message?: unknown; description?: unknown };
        errors?: Array<{ detail?: unknown }>;
      }
    | null;
  const message = body?.error?.message ?? body?.error?.description ?? body?.errors?.[0]?.detail;
  return typeof message === "string" ? message : undefined;
}

async function registerStripeWebhook(
  settings: NonNullable<StoredPaymentSettings["stripe"]>,
  schoolId: string,
): Promise<RegisteredWebhook> {
  const secretKey = settings.secretKey;
  if (!secretKey) throw new WebhookRegistrationError("Add the Stripe secret key first.");
  const headers = {
    authorization: `Bearer ${secretKey}`,
    "content-type": "application/x-www-form-urlencoded",
  };
  const url = paymentWebhookUrl("stripe");

  // Replace this school's earlier endpoints rather than piling up
  // duplicates: Stripe never shows a secret again, so an old endpoint is of
  // no use. Endpoints of other schools or apps on the account stay.
  const list = await fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", { headers });
  if (!list.ok) throw failure("Stripe", list.status, await errorDetail(list));
  const existing = ((await list.json()) as { data?: Array<{ id: string; metadata?: Record<string, string> }> }).data ?? [];
  const stale = existing.filter(
    (endpoint) =>
      endpoint.id === settings.webhookEndpointId ||
      endpoint.metadata?.courselit_school_id === schoolId,
  );

  const body = new URLSearchParams({
    url,
    api_version: STRIPE_WEBHOOK_API_VERSION,
    description: "CourseLit payments",
    "metadata[courselit_school_id]": schoolId,
  });
  PAYMENT_WEBHOOK_EVENTS.stripe.forEach((event, index) =>
    body.append(`enabled_events[${index}]`, event),
  );
  const created = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
    method: "POST",
    headers,
    body,
  });
  if (!created.ok) throw failure("Stripe", created.status, await errorDetail(created));
  const endpoint = (await created.json()) as { id?: string; secret?: string };
  if (!endpoint.id || !endpoint.secret) throw failure("Stripe", created.status);

  for (const old of stale) {
    await fetch(`https://api.stripe.com/v1/webhook_endpoints/${encodeURIComponent(old.id)}`, {
      method: "DELETE",
      headers,
    }).catch(() => undefined);
  }
  return { endpointId: endpoint.id, secret: endpoint.secret, url };
}

async function registerLemonSqueezyWebhook(
  settings: NonNullable<StoredPaymentSettings["lemonsqueezy"]>,
): Promise<RegisteredWebhook> {
  const { apiKey, storeId } = settings;
  if (!apiKey || !storeId) {
    throw new WebhookRegistrationError("Add the Lemon Squeezy API key and store ID first.");
  }
  const headers = {
    authorization: `Bearer ${apiKey}`,
    accept: "application/vnd.api+json",
    "content-type": "application/vnd.api+json",
  };
  const url = paymentWebhookUrl("lemonsqueezy");

  // A webhook only receives events of its own mode, which must match the
  // key's: a test-mode key sells in test mode.
  const me = await fetch("https://api.lemonsqueezy.com/v1/users/me", { headers });
  if (!me.ok) throw failure("Lemon Squeezy", me.status, await errorDetail(me));
  const testMode = ((await me.json()) as { meta?: { test_mode?: unknown } }).meta?.test_mode === true;

  // Lemon Squeezy limits secrets to 40 characters.
  const secret = randomBytes(20).toString("hex");
  const created = await fetch("https://api.lemonsqueezy.com/v1/webhooks", {
    method: "POST",
    headers,
    body: JSON.stringify({
      data: {
        type: "webhooks",
        attributes: { url, events: PAYMENT_WEBHOOK_EVENTS.lemonsqueezy, secret, test_mode: testMode },
        relationships: { store: { data: { type: "stores", id: storeId } } },
      },
    }),
  });
  if (!created.ok) {
    throw failure("Lemon Squeezy", created.status, await errorDetail(created));
  }
  const webhook = (await created.json()) as { data?: { id?: unknown } };
  const endpointId = webhook.data?.id;
  if (endpointId === undefined || endpointId === null) throw failure("Lemon Squeezy", created.status);

  if (settings.webhookEndpointId && settings.webhookEndpointId !== String(endpointId)) {
    await fetch(`https://api.lemonsqueezy.com/v1/webhooks/${encodeURIComponent(settings.webhookEndpointId)}`, {
      method: "DELETE",
      headers,
    }).catch(() => undefined);
  }
  return { endpointId: String(endpointId), secret, url };
}

async function registerRazorpayWebhook(
  settings: NonNullable<StoredPaymentSettings["razorpay"]>,
): Promise<RegisteredWebhook> {
  const { keyId, keySecret } = settings;
  if (!keyId || !keySecret) {
    throw new WebhookRegistrationError("Add the Razorpay key and secret key first.");
  }
  const headers = {
    authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    "content-type": "application/json",
  };
  const url = paymentWebhookUrl("razorpay");

  // Razorpay's API creates and updates webhooks but can't delete them, so
  // the school's earlier webhook (or one already at this URL) is updated in
  // place rather than left behind with a secret nobody knows.
  const list = await fetch("https://api.razorpay.com/v1/webhooks", { headers });
  if (!list.ok) throw failure("Razorpay", list.status, await errorDetail(list));
  const existing = ((await list.json()) as { items?: Array<{ id: string; url?: string }> }).items ?? [];
  const reuse =
    existing.find((webhook) => webhook.id === settings.webhookEndpointId) ??
    existing.find((webhook) => webhook.url === url);

  const secret = randomBytes(20).toString("hex");
  const saved = await fetch(
    `https://api.razorpay.com/v1/webhooks${reuse ? `/${encodeURIComponent(reuse.id)}` : ""}`,
    {
      method: reuse ? "PUT" : "POST",
      headers,
      body: JSON.stringify({
        url,
        secret,
        // Razorpay replaces the whole event set, so name each one.
        events: Object.fromEntries(PAYMENT_WEBHOOK_EVENTS.razorpay.map((event) => [event, true])),
      }),
    },
  );
  if (!saved.ok) throw failure("Razorpay", saved.status, await errorDetail(saved));
  const webhook = (await saved.json()) as { id?: unknown };
  if (typeof webhook.id !== "string") throw failure("Razorpay", saved.status);
  return { endpointId: webhook.id, secret, url };
}

/** Register (or replace) the provider's webhook for a school. */
export async function registerPaymentWebhook(
  provider: PaymentProviderName,
  settings: StoredPaymentSettings,
  schoolId: string,
): Promise<RegisteredWebhook> {
  try {
    switch (provider) {
      case "stripe":
        return await registerStripeWebhook(settings.stripe ?? {}, schoolId);
      case "lemonsqueezy":
        return await registerLemonSqueezyWebhook(settings.lemonsqueezy ?? {});
      case "razorpay":
        return await registerRazorpayWebhook(settings.razorpay ?? {});
    }
  } catch (error) {
    if (error instanceof WebhookRegistrationError) throw error;
    throw new WebhookRegistrationError(
      `Couldn't reach ${PROVIDER_LABELS[provider]} to register the webhook. Try again.`,
    );
  }
}
