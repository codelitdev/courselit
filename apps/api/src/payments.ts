import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { decryptIntegrationSecret } from "./utils/integration-secrets.js";
import type { AppDb } from "./types.js";
import * as schema from "./db/schema/index.js";
import { eq } from "drizzle-orm";

export const paymentProviderNames = ["stripe", "lemonsqueezy", "razorpay"] as const;
export type PaymentProviderName = (typeof paymentProviderNames)[number];

export type StoredPaymentSettings = {
  provider?: PaymentProviderName | null;
  stripe?: {
    publishableKey?: string;
    secretKey?: string;
    webhookSecret?: string;
  };
  razorpay?: {
    keyId?: string;
    keySecret?: string;
    webhookSecret?: string;
  };
  lemonsqueezy?: {
    apiKey?: string;
    storeId?: string;
    oneTimeVariantId?: string;
    monthlyVariantId?: string;
    yearlyVariantId?: string;
    webhookSecret?: string;
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

export type PaymentProvider = {
  name: PaymentProviderName;
  createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult>;
  cancelSubscription?(providerSubscriptionId: string): Promise<void>;
  validateSubscription?(providerSubscriptionId: string): Promise<boolean>;
  verifyWebhook(rawBody: string, headers: Record<string, string | undefined>, now: Date): void;
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent;
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

function integerValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
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

function basicAuth(value: string): string {
  return `Basic ${Buffer.from(`${value}:`, "utf8").toString("base64")}`;
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
        allow_promotion_codes: true,
        "line_items[0][quantity]": 1,
        "line_items[0][price_data][currency]": input.currency.toLowerCase(),
        "line_items[0][price_data][unit_amount]": input.paymentPlan.amountMinor,
        "line_items[0][price_data][product_data][name]": input.product.title,
        ...(recurring
          ? {
              "line_items[0][price_data][recurring][interval]": input.paymentPlan.billingInterval === "year" ? "year" : "month",
              ...(input.paymentPlan.installmentCount
                ? { "subscription_data[metadata][courselit_installment_count]": input.paymentPlan.installmentCount }
                : {}),
            }
          : {}),
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

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
      method: "DELETE",
      headers: { authorization: basicAuth(required(this.settings.secretKey, "stripe_secret_key")) },
    });
    if (!response.ok) throw new Error(`stripe_subscription_cancel_failed_${response.status}`);
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
    const objectMetadata = metadata(object.metadata);
    const subscriptionMetadata = metadata(objectValue(object.subscription_details).metadata);
    const data: Record<string, unknown> = {
      ...object,
      metadata: { ...subscriptionMetadata, ...objectMetadata },
      payment_id: stringValue(object.payment_intent) ?? stringValue(object.id),
      subscription_id: stringValue(object.subscription) ?? stringValue(object.id),
      amount: integerValue(object.amount_total) ?? integerValue(object.amount_paid) ?? integerValue(object.amount),
      currency: stringValue(object.currency)?.toUpperCase(),
      invoice_id: stringValue(object.invoice) ?? stringValue(object.id),
    };
    const eventType =
      eventName === "checkout.session.completed" || eventName === "checkout.session.async_payment_succeeded" || eventName === "invoice.paid"
        ? "payment.succeeded"
        : eventName === "checkout.session.async_payment_failed" || eventName === "invoice.payment_failed"
          ? "payment.failed"
          : eventName === "charge.refunded" || eventName === "refund.created"
            ? "payment.refunded"
            : eventName === "charge.dispute.created"
              ? "payment.disputed"
              : eventName === "customer.subscription.deleted"
                ? "subscription.cancelled"
                : eventName.startsWith("customer.subscription.")
                  ? "subscription.active"
                  : "payment.ignored";
    return { eventId: required(event.id ?? headers["stripe-event-id"], "stripe_event_id"), eventType, data };
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

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const response = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(providerSubscriptionId)}`, {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${required(this.settings.apiKey, "lemonsqueezy_api_key")}`,
        accept: "application/vnd.api+json",
        "content-type": "application/vnd.api+json",
      },
    });
    if (!response.ok) throw new Error(`lemonsqueezy_subscription_cancel_failed_${response.status}`);
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
    const data: Record<string, unknown> = {
      ...attributes,
      id: payload.id,
      metadata: customData,
      custom_data: customData,
      payment_id: stringValue(payload.id) ?? stringValue(attributes.order_id) ?? stringValue(attributes.subscription_id),
      checkout_id: stringValue(customData.courselit_checkout_id),
      subscription_id: stringValue(attributes.subscription_id) ?? stringValue(payload.id),
      invoice_id: stringValue(attributes.order_id),
      amount: integerValue(attributes.total) ?? integerValue(attributes.total_usd) ?? integerValue(attributes.unit_price),
      currency: stringValue(attributes.currency)?.toUpperCase(),
    };
    const eventType = name === "order_created" || name === "subscription_payment_success"
      ? "payment.succeeded"
      : name === "subscription_payment_failed"
        ? "payment.failed"
        : name === "subscription_cancelled" || name === "subscription_expired"
          ? `subscription.${name === "subscription_cancelled" ? "cancelled" : "expired"}`
          : name === "subscription_payment_refunded" || name === "order_refunded"
            ? "payment.refunded"
            : "payment.ignored";
    const fallbackId = createHash("sha256").update(rawBody).digest("hex");
    return { eventId: stringValue(headers["x-event-id"]) ?? stringValue(meta.event_id) ?? fallbackId, eventType, data };
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
      headers: { authorization: basicAuth(`${keyId}:${keySecret}`), "content-type": "application/json", ...(init.headers ?? {}) },
    });
    if (!response.ok) throw new Error(`razorpay_request_failed_${response.status}`);
    return jsonResponse(await response.json(), "razorpay");
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.request(`/subscriptions/${encodeURIComponent(providerSubscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: 0 }),
    });
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
    const data: Record<string, unknown> = {
      ...source,
      metadata: metadata(notes),
      payment_id: stringValue(payment.id) ?? stringValue(source.id),
      subscription_id: stringValue(subscription.id) ?? (Object.keys(subscription).length ? stringValue(source.id) : null),
      checkout_id: stringValue(notes.courselit_checkout_id),
      amount: integerValue(payment.amount) ?? integerValue(source.amount),
      currency: stringValue(payment.currency) ?? stringValue(source.currency),
    };
    const eventType = name === "order.paid" || name === "subscription.charged"
      ? "payment.succeeded"
      : name.includes("failed")
        ? "payment.failed"
        : name.includes("cancelled") || name.includes("halted")
          ? "subscription.cancelled"
          : name.includes("refunded")
            ? "payment.refunded"
            : name.includes("disputed")
              ? "payment.disputed"
              : "payment.ignored";
    const fallbackId = createHash("sha256").update(rawBody).digest("hex");
    return { eventId: stringValue(headers["x-razorpay-event-id"]) ?? stringValue(event.id) ?? fallbackId, eventType, data };
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
  if (expectedName && settings.provider !== expectedName) return null;
  return paymentProviderFromSettings(settings);
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

export function providerSettingsDto(settings: StoredPaymentSettings) {
  return {
    provider: settings.provider ?? null,
    stripe: { publishableKey: settings.stripe?.publishableKey ?? "", secretConfigured: Boolean(settings.stripe?.secretKey), webhookSecretConfigured: Boolean(settings.stripe?.webhookSecret) },
    razorpay: { keyId: settings.razorpay?.keyId ?? "", secretConfigured: Boolean(settings.razorpay?.keySecret), webhookSecretConfigured: Boolean(settings.razorpay?.webhookSecret) },
    lemonsqueezy: { storeId: settings.lemonsqueezy?.storeId ?? "", oneTimeVariantId: settings.lemonsqueezy?.oneTimeVariantId ?? "", monthlyVariantId: settings.lemonsqueezy?.monthlyVariantId ?? "", yearlyVariantId: settings.lemonsqueezy?.yearlyVariantId ?? "", apiKeyConfigured: Boolean(settings.lemonsqueezy?.apiKey), webhookSecretConfigured: Boolean(settings.lemonsqueezy?.webhookSecret) },
  };
}
