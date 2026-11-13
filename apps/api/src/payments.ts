import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { paymentWebhookUrl } from "./payment-webhooks.js";
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";
import type { AppDb } from "./types.js";
import * as schema from "./db/schema/index.js";
import { eq } from "drizzle-orm";

export const paymentProviderNames = ["stripe", "lemonsqueezy", "razorpay"] as const;
export type PaymentProviderName = (typeof paymentProviderNames)[number];

/**
 * The school and provider whose webhook secret verified an event. Any school
 * owner can sign events with their own secret, so every checkout, payment,
 * invoice and subscription an event touches must belong to this scope.
 */
export type PaymentWebhookScope = {
  schoolId: string;
  provider: Exclude<PaymentProviderName, "free">;
};

export type StoredPaymentSettings = {
  provider?: PaymentProviderName | null;
  stripe?: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
    /** Set by automatic webhook registration (see payment-webhooks.ts). */
    webhookEndpointId?: string;
    webhookUrl?: string;
    /** Why the last automatic registration failed. */
    webhookError?: string;
  };
  razorpay?: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
    /** Set by automatic webhook registration (see payment-webhooks.ts). */
    webhookEndpointId?: string;
    webhookUrl?: string;
    /** Why the last automatic registration failed. */
    webhookError?: string;
  };
  lemonsqueezy?: {
    apiKey?: string;
    storeId?: string;
    oneTimeVariantId?: string;
    monthlyVariantId?: string;
    yearlyVariantId?: string;
    webhookSecret?: string;
    /** Set by automatic webhook registration (see payment-webhooks.ts). */
    webhookEndpointId?: string;
    webhookUrl?: string;
    /** Why the last automatic registration failed. */
    webhookError?: string;
  };
};

export type PaymentCheckoutInput = {
  paymentPlan: {
    kind: "free" | "one_time" | "subscription" | "installment";
    amountMinor: number;
    billingInterval: "month" | "year" | null;
    installmentCount: number | null;
    providerProductId: string | null;
  };
  product: { id: string; title: string };
  customer: { email: string; name: string };
  currency: string;
  returnUrl: string;
  metadata: Record<string, string>;
};

export type PaymentCheckoutResult = {
  checkoutId: string;
  checkoutUrl: string | null;
  checkoutData: {
    provider: PaymentProviderName;
    publicKey?: string;
    orderId?: string;
    subscriptionId?: string;
    customerEmail?: string;
    customerName?: string;
  } | null;
};

export type NormalizedPaymentEvent = {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
};

export type CancelSubscriptionOptions = {
  /**
   * Stop renewing but keep the subscription (and the learner's access) until
   * the end of the period already paid for. Defaults to an immediate cancel.
   */
  atPeriodEnd?: boolean;
};

export type CancelSubscriptionResult = {
  /** When the provider will end the subscription, if it reports it. */
  endsAt: Date | null;
};

export type PaymentProvider = {
  name: PaymentProviderName;
  createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult>;
  cancelSubscription?(
    providerSubscriptionId: string,
    options?: CancelSubscriptionOptions,
  ): Promise<CancelSubscriptionResult | void>;
  validateSubscription?(providerSubscriptionId: string): Promise<boolean>;
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, now: Date): void;
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent;
  /**
   * Fills in what a verified event leaves out but later events will refer to,
   * by asking the provider. Throws when the provider can't be reached, so the
   * event is retried.
   */
  completeWebhookEvent?(event: NormalizedPaymentEvent): Promise<NormalizedPaymentEvent>;
};

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${field}_required`);
  return value.trim();
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Provider ids may be JSON numbers (Lemon Squeezy attribute references). */
function idString(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  return stringValue(value);
}

function integerValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

/** Provider timestamps arrive as Unix seconds (Stripe, Razorpay) or ISO strings. */
function isoDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  return null;
}

function dateOrNull(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function metadata(value: unknown): Record<string, string> {
  const source = objectValue(value);
  return Object.fromEntries(
    Object.entries(source).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function form(fields: Record<string, string | number | boolean | undefined>): string {
  return Object.entries(fields)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function jsonResponse(body: unknown, provider: string): Record<string, unknown> {
  const object = objectValue(body);
  if (Object.keys(object).length === 0) throw new Error(`${provider}_invalid_response`);
  return object;
}

/** HTTP Basic auth; Stripe takes the secret key as the user and no password. */
function basicAuth(user: string, password = ""): string {
  return `Basic ${Buffer.from(`${user}:${password}`, "utf8").toString("base64")}`;
}

function hmacHex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}

function verifyDigest(actualValue: string, expectedValue: string, errorCode: string): void {
  const actual = Buffer.from(actualValue, "utf8");
  const expected = Buffer.from(expectedValue, "utf8");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error(errorCode);
  }
}

/**
 * Stripe takes amounts in the currency's minor unit, except ISK and UGX: both
 * have no decimals, yet Stripe still expects them in hundredths (5 ISK is 500).
 * https://docs.stripe.com/currencies#special-cases
 */
const STRIPE_HUNDREDTHS = new Set(["ISK", "UGX"]);

export function toStripeAmount(amountMinor: number, currency: string): number {
  return STRIPE_HUNDREDTHS.has(currency.toUpperCase()) ? amountMinor * 100 : amountMinor;
}

export function fromStripeAmount(amount: number, currency: string): number {
  return STRIPE_HUNDREDTHS.has(currency.toUpperCase()) ? Math.round(amount / 100) : amount;
}

class StripePayment implements PaymentProvider {
  readonly name = "stripe" as const;
  constructor(private readonly settings: NonNullable<StoredPaymentSettings["stripe"]>) {}

  async createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult> {
    const secretKey = required(this.settings.secretKey, "stripe_secret_key");
    const recurring = input.paymentPlan.kind === "subscription" || input.paymentPlan.kind === "installment";
    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { authorization: basicAuth(secretKey), "content-type": "application/x-www-form-urlencoded" },
      body: form({
        mode: recurring ? "subscription" : "payment",
        success_url: input.returnUrl,
        cancel_url: input.returnUrl,
        customer_email: input.customer.email,
        // No `allow_promotion_codes`: a Stripe-side promo code changes the
        // paid amount, and the webhook's strict amount check would then
        // reject a payment the learner already made.
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": toStripeAmount(
          input.paymentPlan.amountMinor,
          input.currency,
        ),
        "line_items[0][price_data][product_data][name]": input.product.title,
        ...(recurring
          ? {
              "line_items[0][price_data][recurring][interval]": input.paymentPlan.billingInterval === "year" ? "year" : "month",
              // Renewal invoices only carry the subscription's metadata, so
              // the checkout identifiers must live on the subscription too.
              ...Object.fromEntries(
                Object.entries(input.metadata).map(([key, value]) => [
                  `subscription_data[metadata][${key}]`,
                  value,
                ]),
              ),
              ...(input.paymentPlan.installmentCount
                ? { "subscription_data[metadata][courselit_installment_count]": input.paymentPlan.installmentCount }
                : {}),
            }
          : Object.fromEntries(
              // Refund and dispute events carry the charge, not the session.
              Object.entries(input.metadata).map(([key, value]) => [
                `payment_intent_data[metadata][${key}]`,
                value,
              ]),
            )),
        ...Object.fromEntries(Object.entries(input.metadata).map(([key, value]) => [`metadata[${key}]`, value])),
      }),
    });
    if (!response.ok) throw new Error(`stripe_checkout_failed_${response.status}`);
    const body = jsonResponse(await response.json(), "stripe");
    return {
      checkoutId: required(body.id, "stripe_checkout_id"),
      checkoutUrl: required(body.url, "stripe_checkout_url"),
      checkoutData: null,
    };
  }

  async cancelSubscription(
    providerSubscriptionId: string,
    options: CancelSubscriptionOptions = {},
  ): Promise<CancelSubscriptionResult> {
    const authorization = basicAuth(required(this.settings.secretKey, "stripe_secret_key"));
    const url = `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`;
    const response = options.atPeriodEnd
      ? await fetch(url, {
          method: "POST",
          headers: { authorization, "content-type": "application/x-www-form-urlencoded" },
          body: form({ cancel_at_period_end: true }),
        })
      : await fetch(url, { method: "DELETE", headers: { authorization } });
    if (!response.ok) throw new Error(`stripe_subscription_cancel_failed_${response.status}`);
    const body = objectValue(await response.json().catch(() => ({})));
    return {
      endsAt: options.atPeriodEnd
        ? dateOrNull(isoDate(body.cancel_at) ?? stripePeriodEnd(body))
        : null,
    };
  }

  async validateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
        headers: { authorization: basicAuth(required(this.settings.secretKey, "stripe_secret_key")) },
      });
      if (!response.ok) return false;
      const body = objectValue(await response.json());
      return body.status === "active";
    } catch {
      return false;
    }
  }

  /**
   * A subscription's payments are reported against its invoices: the checkout
   * session (first payment) and, from API version 2025-03-31, renewal
   * invoices carry no payment intent. A refund or dispute, though, names only
   * the payment intent (its charge no longer links to the invoice), so record
   * each invoice payment under the payment intent that paid it.
   */
  async completeWebhookEvent(event: NormalizedPaymentEvent): Promise<NormalizedPaymentEvent> {
    const invoiceId = stringValue(event.data.invoice_id);
    const paymentId = stringValue(event.data.payment_id);
    if (event.eventType !== "payment.succeeded" || !invoiceId || paymentId?.startsWith("pi_")) {
      return event;
    }
    const response = await fetch(
      `https://api.stripe.com/v1/invoice_payments?invoice=${encodeURIComponent(invoiceId)}&limit=10`,
      {
        headers: {
          authorization: basicAuth(required(this.settings.secretKey, "stripe_secret_key")),
          // Invoice payments exist from this version on; pin it so the call
          // works whatever version the account defaults to.
          "stripe-version": "2025-03-31.basil",
        },
      },
    );
    if (!response.ok) throw new Error(`stripe_invoice_payments_failed_${response.status}`);
    const payments = (objectValue(await response.json()).data as unknown[] | undefined) ?? [];
    const paid = payments
      .map(objectValue)
      .find((item) => item.status === "paid" && objectValue(item.payment).type === "payment_intent");
    const paymentIntent = stringValue(objectValue(paid?.payment).payment_intent);
    return paymentIntent
      ? { ...event, data: { ...event.data, payment_id: paymentIntent } }
      : event;
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, now: Date): void {
    const signature = required(headers["stripe-signature"], "stripe_signature");
    const secret = required(this.settings.webhookSecret, "stripe_webhook_secret");
    const timestamp = signature.match(/(?:^|,)t=(\d+)/)?.[1];
    if (!timestamp || Math.abs(Math.floor(now.getTime() / 1000) - Number(timestamp)) > 300) {
      throw new Error("stripe_signature_expired");
    }
    const candidates = signature
      .split(",")
      .filter((item) => item.startsWith("v1="))
      .map((item) => item.slice(3));
    const expected = hmacHex(secret, `${timestamp}.${rawBody}`);
    if (!candidates.some((candidate) => {
      try { verifyDigest(candidate, expected, "stripe_signature_invalid"); return true; } catch { return false; }
    })) throw new Error("stripe_signature_invalid");
  }

  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent {
    const event = objectValue(JSON.parse(rawBody));
    const object = objectValue(objectValue(event.data).object);
    const eventName = required(event.type, "stripe_event_type");
    const objectType = stringValue(object.object);
    const isSubscriptionObject =
      objectType === "subscription" || eventName.startsWith("customer.subscription.");
    const isInvoiceObject = objectType === "invoice" || eventName.startsWith("invoice.");
    // Invoices carry subscription metadata in `subscription_details` (and in
    // `parent.subscription_details` from API version 2025-03-31 onwards).
    const subscriptionDetails = {
      ...objectValue(objectValue(object.parent).subscription_details),
      ...objectValue(object.subscription_details),
    };
    const objectMetadata = metadata(object.metadata);
    const subscriptionMetadata = metadata(subscriptionDetails.metadata);
    const periodEnd = isSubscriptionObject ? stripePeriodEnd(object) : null;
    const cancelAt = isSubscriptionObject
      ? isoDate(object.cancel_at) ?? (object.cancel_at_period_end === true ? periodEnd : null)
      : null;
    const stripeCurrency = stringValue(object.currency)?.toUpperCase();
    const rawAmount =
      integerValue(object.amount_total) ??
      integerValue(object.amount_paid) ??
      integerValue(object.amount);
    const stripeAmount =
      rawAmount === null || !stripeCurrency
        ? rawAmount
        : fromStripeAmount(rawAmount, stripeCurrency);
    // A charge reports everything refunded so far, across partial refunds.
    const rawRefunded = integerValue(object.amount_refunded);
    const stripeRefunded =
      rawRefunded === null || !stripeCurrency
        ? rawRefunded
        : fromStripeAmount(rawRefunded, stripeCurrency);
    const data: Record<string, unknown> = {
      ...object,
      metadata: { ...subscriptionMetadata, ...objectMetadata },
      payment_id: stringValue(object.payment_intent) ?? stringValue(object.id),
      subscription_id:
        stringValue(object.subscription) ??
        stringValue(subscriptionDetails.subscription) ??
        (isSubscriptionObject ? stringValue(object.id) : null),
      amount: stripeAmount,
      refunded_amount: stripeRefunded,
      currency: stripeCurrency,
      // A subscription-mode checkout session and the first invoice share the
      // invoice id; a charge carries it as `invoice` on older API versions.
      invoice_id: isInvoiceObject ? stringValue(object.id) : stringValue(object.invoice),
      current_period_end: periodEnd,
      cancel_at: cancelAt,
    };
    return {
      eventId: required(event.id ?? headers["stripe-event-id"], "stripe_event_id"),
      eventType: stripeEventType(eventName, object),
      data,
    };
  }
}

/** Current period end of a Stripe subscription across API versions. */
function stripePeriodEnd(subscription: Record<string, unknown>): string | null {
  const firstItem = objectValue(
    (objectValue(subscription.items).data as unknown[] | undefined)?.[0],
  );
  return isoDate(subscription.current_period_end) ?? isoDate(firstItem.current_period_end);
}

/**
 * Map a Stripe event to a normalised payment event. Each charge is counted
 * once: the checkout session completion is the first payment of a
 * subscription, so the `invoice.paid` for that same first invoice
 * (`billing_reason: subscription_create`) is ignored and only renewals
 * (`subscription_cycle`, etc.) count from `invoice.paid`.
 */
function stripeEventType(eventName: string, object: Record<string, unknown>): string {
  switch (eventName) {
    case "checkout.session.completed":
      // Delayed payment methods complete the session before the money moves;
      // `async_payment_succeeded` follows once it does.
      return object.payment_status === "unpaid" ? "payment.processing" : "payment.succeeded";
    case "checkout.session.async_payment_succeeded":
      return "payment.succeeded";
    case "invoice.paid":
      return object.billing_reason === "subscription_create"
        ? "payment.ignored"
        : "payment.succeeded";
    case "checkout.session.async_payment_failed":
    case "invoice.payment_failed":
      return "payment.failed";
    case "charge.refunded":
      // Partial refunds keep access; only a fully refunded charge revokes it.
      return object.refunded === false ? "payment.partially_refunded" : "payment.refunded";
    case "charge.dispute.created":
      return "payment.disputed";
    case "customer.subscription.deleted":
      return "subscription.cancelled";
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      switch (object.status) {
        case "active":
        case "trialing":
          return object.cancel_at_period_end === true || object.cancel_at
            ? "subscription.cancel_scheduled"
            : "subscription.active";
        case "past_due":
        case "unpaid":
        case "paused":
          return "subscription.past_due";
        case "canceled":
          return "subscription.cancelled";
        case "incomplete_expired":
          return "subscription.expired";
        default:
          return "payment.ignored";
      }
    default:
      return "payment.ignored";
  }
}

class LemonSqueezyPayment implements PaymentProvider {
  readonly name = "lemonsqueezy" as const;
  constructor(private readonly settings: NonNullable<StoredPaymentSettings["lemonsqueezy"]>) {}

  async createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult> {
    const apiKey = required(this.settings.apiKey, "lemonsqueezy_api_key");
    const storeId = required(this.settings.storeId, "lemonsqueezy_store_id");
    const variant = input.paymentPlan.kind === "one_time"
      ? required(this.settings.oneTimeVariantId, "lemonsqueezy_one_time_variant_id")
      : input.paymentPlan.billingInterval === "year"
        ? required(this.settings.yearlyVariantId, "lemonsqueezy_yearly_variant_id")
        : required(this.settings.monthlyVariantId, "lemonsqueezy_monthly_variant_id");
    const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/vnd.api+json",
        "content-type": "application/vnd.api+json",
        "X-Version": "2023-06-30",
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            checkout_data: {
              email: input.customer.email,
              name: input.customer.name,
              custom: input.metadata,
            },
            product_options: {
              name: input.product.title,
              enabled_variants: [variant],
              redirect_url: input.returnUrl,
              receipt_button_text: "Continue",
              receipt_thank_you_note: "Thank you for your purchase!",
            },
            custom_price: input.paymentPlan.amountMinor,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          },
          relationships: {
            store: { data: { type: "stores", id: storeId } },
            variant: { data: { type: "variants", id: variant } },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`lemonsqueezy_checkout_failed_${response.status}`);
    const body = objectValue(objectValue(await response.json()).data);
    const attributes = objectValue(body.attributes);
    return {
      checkoutId: required(body.id, "lemonsqueezy_checkout_id"),
      checkoutUrl: required(attributes.url, "lemonsqueezy_checkout_url"),
      checkoutData: null,
    };
  }

  /**
   * Lemon Squeezy has no immediate cancel: `DELETE /v1/subscriptions/:id`
   * always cancels at the end of the paid period. The subscription stays
   * `cancelled` (still entitled) until `ends_at`, when Lemon Squeezy sends
   * `subscription_expired`. `atPeriodEnd` is therefore always honoured.
   */
  async cancelSubscription(
    providerSubscriptionId: string,
    _options: CancelSubscriptionOptions = {},
  ): Promise<CancelSubscriptionResult> {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${required(this.settings.apiKey, "lemonsqueezy_api_key")}`,
        accept: "application/vnd.api+json",
        "content-type": "application/vnd.api+json",
      },
    });
    if (!response.ok) throw new Error(`lemonsqueezy_subscription_cancel_failed_${response.status}`);
    const body = objectValue(await response.json().catch(() => ({})));
    const attributes = objectValue(objectValue(body.data).attributes);
    return { endsAt: dateOrNull(isoDate(attributes.ends_at)) };
  }

  async validateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
        headers: {
          authorization: `Bearer ${required(this.settings.apiKey, "lemonsqueezy_api_key")}`,
          accept: "application/vnd.api+json",
          "X-Version": "2023-06-30",
        },
      });
      if (!response.ok) return false;
      const body = objectValue(await response.json());
      const attributes = objectValue(objectValue(body.data).attributes);
      return attributes.status === "active";
    } catch {
      return false;
    }
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, _now: Date): void {
    const secret = required(this.settings.webhookSecret, "lemonsqueezy_webhook_secret");
    verifyDigest(required(headers["x-signature"], "lemonsqueezy_signature"), hmacHex(secret, rawBody), "lemonsqueezy_signature_invalid");
  }

  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent {
    const event = objectValue(JSON.parse(rawBody));
    const payload = objectValue(event.data);
    const attributes = objectValue(payload.attributes);
    const meta = objectValue(event.meta);
    const customData = metadata(meta.custom_data);
    const name = stringValue(meta.event_name) ?? stringValue(headers["x-event-name"]) ?? "unknown";
    // JSON:API resource type: "orders", "subscriptions" or
    // "subscription-invoices". Older payloads may omit it.
    const resourceType =
      stringValue(payload.type) ??
      (name.startsWith("order_")
        ? "orders"
        : name.startsWith("subscription_payment_")
          ? "subscription-invoices"
          : name.startsWith("subscription_")
            ? "subscriptions"
            : null);
    const resourceId = idString(payload.id);
    const isSubscription = resourceType === "subscriptions";
    const data: Record<string, unknown> = {
      ...attributes,
      id: payload.id,
      metadata: customData,
      custom_data: customData,
      // Orders and subscription invoices are charges; a subscription is not.
      payment_id: isSubscription ? null : resourceId,
      checkout_id: stringValue(customData.courselit_checkout_id),
      // Orders carry no subscription id; the subscription is linked from
      // `subscription_created` or the first renewal invoice.
      subscription_id: idString(attributes.subscription_id) ?? (isSubscription ? resourceId : null),
      invoice_id: isSubscription ? null : resourceId,
      amount: integerValue(attributes.total) ?? integerValue(attributes.total_usd) ?? integerValue(attributes.unit_price),
      // Everything refunded so far on the order or invoice.
      refunded_amount: integerValue(attributes.refunded_amount),
      currency: stringValue(attributes.currency)?.toUpperCase(),
      current_period_end: isSubscription
        ? isoDate(attributes.renews_at) ?? isoDate(attributes.ends_at)
        : null,
      cancel_at:
        isSubscription && (attributes.cancelled === true || attributes.status === "cancelled")
          ? isoDate(attributes.ends_at)
          : null,
      // The first charge of a subscription is both an order and an
      // `initial` subscription invoice; refunds may reference either.
      initial_charge: attributes.billing_reason === "initial",
    };
    // Dedupe only on signed body fields: headers are outside the signature,
    // so a replayed body with a fresh header must map to the same key.
    const version = stringValue(attributes.updated_at) ?? stringValue(attributes.created_at);
    const bodyEventId = stringValue(meta.event_id);
    const eventId = bodyEventId
      ? `lemonsqueezy:${bodyEventId}`
      : version && resourceId && stringValue(meta.event_name)
        ? `lemonsqueezy:${name}:${resourceType ?? ""}:${resourceId}:${version}`
        : signedBodyKey("lemonsqueezy", rawBody);
    return {
      eventId,
      eventType: lemonSqueezyEventType(name, attributes),
      data,
    };
  }
}

/** Deterministic dedupe key derived from the signed raw body only. */
function signedBodyKey(provider: string, rawBody: string): string {
  return `${provider}:body:${createHash("sha256").update(rawBody).digest("hex")}`;
}

/**
 * Map a Lemon Squeezy event to a normalised payment event. The first charge
 * of a subscription arrives twice (`order_created` and an `initial`
 * `subscription_payment_success`); only the order counts. A cancelled
 * subscription stays entitled until `ends_at`, when `subscription_expired`
 * ends access.
 */
function lemonSqueezyEventType(name: string, attributes: Record<string, unknown>): string {
  switch (name) {
    case "order_created":
      return attributes.status === "pending"
        ? "payment.processing"
        : attributes.status === "failed"
          ? "payment.failed"
          : "payment.succeeded";
    case "subscription_payment_success":
    case "subscription_payment_recovered":
      return attributes.billing_reason === "initial" ? "payment.ignored" : "payment.succeeded";
    case "subscription_payment_failed":
      return "payment.failed";
    case "order_refunded":
    case "subscription_payment_refunded":
      return attributes.status === "partial_refund"
        ? "payment.partially_refunded"
        : "payment.refunded";
    case "subscription_cancelled":
      return "subscription.cancel_scheduled";
    case "subscription_expired":
      return "subscription.expired";
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
    case "subscription_paused":
    case "subscription_unpaused":
      switch (attributes.status) {
        case "active":
        case "on_trial":
          return attributes.cancelled === true
            ? "subscription.cancel_scheduled"
            : "subscription.active";
        case "cancelled":
          return "subscription.cancel_scheduled";
        case "past_due":
        case "unpaid":
        case "paused":
          return "subscription.past_due";
        case "expired":
          return "subscription.expired";
        default:
          return "payment.ignored";
      }
    default:
      return "payment.ignored";
  }
}

class RazorpayPayment implements PaymentProvider {
  readonly name = "razorpay" as const;
  constructor(private readonly settings: NonNullable<StoredPaymentSettings["razorpay"]>) {}

  private async request(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const keyId = required(this.settings.keyId, "razorpay_key_id");
    const keySecret = required(this.settings.keySecret, "razorpay_key_secret");
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: { authorization: basicAuth(keyId, keySecret), "content-type": "application/json", ...(init.headers ?? {}) },
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: { description?: unknown } } | null;
      const reason = typeof body?.error?.description === "string" ? `: ${body.error.description}` : "";
      throw new Error(`razorpay_request_failed_${response.status}${reason}`);
    }
    return jsonResponse(await response.json(), "razorpay");
  }

  /**
   * `cancel_at_cycle_end: 1` keeps the subscription active until the current
   * billing cycle ends; Razorpay sends `subscription.cancelled` at that point.
   */
  async cancelSubscription(
    providerSubscriptionId: string,
    options: CancelSubscriptionOptions = {},
  ): Promise<CancelSubscriptionResult> {
    const subscription = await this.request(`/subscriptions/${encodeURIComponent(providerSubscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: options.atPeriodEnd ? 1 : 0 }),
    });
    return {
      endsAt: options.atPeriodEnd ? dateOrNull(isoDate(subscription.current_end)) : null,
    };
  }

  async validateSubscription(providerSubscriptionId: string): Promise<boolean> {
    try {
      const subscription = await this.request(`/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
        method: "GET",
      });
      return subscription.status === "active";
    } catch {
      return false;
    }
  }

  async createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult> {
    const keyId = required(this.settings.keyId, "razorpay_key_id");
    const notes = input.metadata;
    if (input.paymentPlan.kind === "one_time") {
      const order = await this.request("/orders", {
        method: "POST",
        body: JSON.stringify({ amount: input.paymentPlan.amountMinor, currency: input.currency.toUpperCase(), notes }),
      });
      const orderId = required(order.id, "razorpay_order_id");
      return {
        checkoutId: orderId,
        checkoutUrl: null,
        checkoutData: { provider: this.name, publicKey: keyId, orderId, customerEmail: input.customer.email, customerName: input.customer.name },
      };
    }
    const period = input.paymentPlan.billingInterval === "year" ? "yearly" : "monthly";
    const plan = await this.request("/plans", {
      method: "POST",
      body: JSON.stringify({ period, interval: 1, item: { name: input.product.title, amount: input.paymentPlan.amountMinor, currency: input.currency.toUpperCase(), description: input.product.title }, notes }),
    });
    const subscription = await this.request("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: required(plan.id, "razorpay_plan_id"),
        total_count:
          input.paymentPlan.installmentCount ??
          (input.paymentPlan.billingInterval === "year" ? 10 : 120),
        customer_notify: 1,
        notes,
      }),
    });
    const subscriptionId = required(subscription.id, "razorpay_subscription_id");
    return {
      checkoutId: subscriptionId,
      checkoutUrl: null,
      checkoutData: { provider: this.name, publicKey: keyId, subscriptionId, customerEmail: input.customer.email, customerName: input.customer.name },
    };
  }

  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, _now: Date): void {
    verifyDigest(required(headers["x-razorpay-signature"], "razorpay_signature"), hmacHex(required(this.settings.webhookSecret, "razorpay_webhook_secret"), rawBody), "razorpay_signature_invalid");
  }

  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent {
    const event = objectValue(JSON.parse(rawBody));
    const payload = objectValue(event.payload);
    const payment = objectValue(objectValue(payload.payment).entity);
    const order = objectValue(objectValue(payload.order).entity);
    const subscription = objectValue(objectValue(payload.subscription).entity);
    const source = Object.keys(order).length > 0 ? order : subscription;
    const notes = objectValue(source.notes);
    const name = required(event.event, "razorpay_event");
    const refund = objectValue(objectValue(payload.refund).entity);
    const dispute = objectValue(objectValue(payload.dispute).entity);
    const hasSubscription = Object.keys(subscription).length > 0;
    const remainingCount = integerValue(subscription.remaining_count);
    const data: Record<string, unknown> = {
      ...source,
      metadata: metadata(notes),
      // Every Razorpay charge, including the first one of a subscription,
      // has one payment id; `order.paid` and `subscription.charged` for the
      // same charge therefore collapse onto one recorded payment.
      payment_id:
        stringValue(payment.id) ??
        stringValue(refund.payment_id) ??
        stringValue(dispute.payment_id) ??
        stringValue(source.id),
      subscription_id: stringValue(subscription.id) ?? (hasSubscription ? stringValue(source.id) : null),
      checkout_id: stringValue(notes.courselit_checkout_id),
      invoice_id: stringValue(payment.invoice_id),
      amount: integerValue(payment.amount) ?? integerValue(source.amount),
      // Everything refunded so far on the payment, across partial refunds.
      refunded_amount: integerValue(payment.amount_refunded) ?? integerValue(refund.amount),
      currency: stringValue(payment.currency) ?? stringValue(source.currency),
      current_period_end: hasSubscription ? isoDate(subscription.current_end) : null,
      // `end_at` is the planned end after `total_count` charges, not a
      // cancellation, so it is deliberately not reported as `cancel_at`.
      cancel_at: null,
      // Razorpay ends a subscription itself after `total_count` charges.
      subscription_completed:
        subscription.status === "completed" || remainingCount === 0,
    };
    // Dedupe only on signed body fields: headers are outside the signature.
    const createdAt = integerValue(event.created_at);
    const entityIds = [refund.id, dispute.id, payment.id, source.id]
      .map(stringValue)
      .filter((id): id is string => Boolean(id));
    const bodyEventId = stringValue(event.id);
    const eventId = bodyEventId
      ? `razorpay:${bodyEventId}`
      : createdAt !== null && entityIds.length > 0
        ? `razorpay:${name}:${entityIds.join(":")}:${stringValue(payment.status) ?? ""}:${stringValue(payment.refund_status) ?? ""}:${createdAt}`
        : signedBodyKey("razorpay", rawBody);
    return {
      eventId,
      eventType: razorpayEventType(name, payment, refund),
      data,
    };
  }
}

/**
 * Map a Razorpay event to a normalised payment event. `subscription.charged`
 * fires once per charge including the first; `order.paid` fires for one-time
 * orders. `payment.captured` / `payment.authorized` are ignored so a charge is
 * never counted from two events with different ids.
 */
function razorpayEventType(
  name: string,
  payment: Record<string, unknown>,
  refund: Record<string, unknown>,
): string {
  switch (name) {
    case "order.paid":
    case "subscription.charged":
      return "payment.succeeded";
    case "payment.failed":
      return "payment.failed";
    case "refund.processed": {
      // Judge by the total refunded so far: a second partial refund can
      // complete the first.
      if (payment.refund_status === "full") return "payment.refunded";
      const paymentAmount = integerValue(payment.amount);
      const refunded =
        integerValue(payment.amount_refunded) ?? integerValue(refund.amount);
      const full =
        paymentAmount !== null && refunded !== null && refunded >= paymentAmount;
      return full ? "payment.refunded" : "payment.partially_refunded";
    }
    case "payment.dispute.created":
      return "payment.disputed";
    case "subscription.cancelled":
    case "subscription.halted":
      return "subscription.cancelled";
    case "subscription.completed":
      return "subscription.expired";
    default:
      return "payment.ignored";
  }
}

export function parseStoredPaymentSettings(value: string | null | undefined): StoredPaymentSettings {
  if (!value) return {};
  try {
    const parsed = JSON.parse(decryptIntegrationSecret(value));
    return objectValue(parsed) as StoredPaymentSettings;
  } catch {
    return {};
  }
}

export function paymentProviderFromSettings(settings: StoredPaymentSettings): PaymentProvider | null {
  if (settings.provider === "stripe") return new StripePayment(settings.stripe ?? {});
  if (settings.provider === "lemonsqueezy") return new LemonSqueezyPayment(settings.lemonsqueezy ?? {});
  if (settings.provider === "razorpay") return new RazorpayPayment(settings.razorpay ?? {});
  return null;
}

export async function getConfiguredPaymentProvider(
  db: AppDb,
  schoolId: string,
  expectedName?: PaymentProviderName,
  override?: PaymentProvider,
): Promise<PaymentProvider | null> {
  if (override && (!expectedName || override.name === expectedName)) return override;
  const rows = await db
    .select({ paymentSettingsEncrypted: schema.schools.paymentSettingsEncrypted })
    .from(schema.schools)
    .where(eq(schema.schools.id, schoolId))
    .limit(1);
  const settings = parseStoredPaymentSettings(rows[0]?.paymentSettingsEncrypted);
  // A purchase stays with the provider that took it: after a school switches
  // provider, renewals, refunds and cancellations of earlier purchases still
  // go through the old one while its credentials are kept.
  if (expectedName) return paymentProviderNamed(settings, expectedName);
  return paymentProviderFromSettings(settings);
}

function paymentProviderNamed(
  settings: StoredPaymentSettings,
  name: PaymentProviderName,
): PaymentProvider | null {
  const credentials = settings[name];
  if (!credentials || !Object.values(credentials).some((value) => Boolean(value))) {
    return null;
  }
  return paymentProviderFromSettings({ ...settings, provider: name });
}

export async function getPaymentProvider(
  db: AppDb,
  schoolId: string,
  override?: PaymentProvider,
): Promise<PaymentProvider | null> {
  if (override) return override;
  const rows = await db.select({ paymentSettingsEncrypted: schema.schools.paymentSettingsEncrypted }).from(schema.schools).where(eq(schema.schools.id, schoolId)).limit(1);
  const configured = paymentProviderFromSettings(parseStoredPaymentSettings(rows[0]?.paymentSettingsEncrypted));
  if (configured) return configured;
  return null;
}

function webhookStatus(
  provider: PaymentProviderName,
  group: { webhookSecret?: string; webhookUrl?: string; webhookError?: string } | undefined,
) {
  const url = paymentWebhookUrl(provider);
  return {
    url,
    // A webhook registered for another URL (the school moved domains) no
    // longer receives events.
    connected: Boolean(group?.webhookSecret) && group?.webhookUrl === url,
    error: group?.webhookError ?? null,
  };
}

export function providerSettingsDto(settings: StoredPaymentSettings) {
  return {
    provider: settings.provider ?? null,
    stripe: {
      publishableKey: settings.stripe?.publishableKey ?? "",
      secretConfigured: Boolean(settings.stripe?.secretKey),
      webhook: webhookStatus("stripe", settings.stripe),
    },
    razorpay: {
      keyId: settings.razorpay?.keyId ?? "",
      secretConfigured: Boolean(settings.razorpay?.keySecret),
      webhook: webhookStatus("razorpay", settings.razorpay),
    },
    lemonsqueezy: {
      storeId: settings.lemonsqueezy?.storeId ?? "",
      oneTimeVariantId: settings.lemonsqueezy?.oneTimeVariantId ?? "",
      monthlyVariantId: settings.lemonsqueezy?.monthlyVariantId ?? "",
      yearlyVariantId: settings.lemonsqueezy?.yearlyVariantId ?? "",
      apiKeyConfigured: Boolean(settings.lemonsqueezy?.apiKey),
      webhook: webhookStatus("lemonsqueezy", settings.lemonsqueezy),
    },
  };
}
