import { createHmac } from "node:crypto";
import { describe, expect, it } from "bun:test";
import {
  paymentProviderFromSettings,
  type PaymentCheckoutInput,
} from "./payments.js";

const checkoutInput: PaymentCheckoutInput = {
  paymentPlan: {
    kind: "one_time",
    amountMinor: 2500,
    billingInterval: null,
    installmentCount: null,
    providerProductId: null,
  },
  product: { id: "prd_test", title: "Test course" },
  customer: { email: "learner@example.com", name: "Test Learner" },
  currency: "USD",
  returnUrl: "http://localhost:3001/checkout?session=chk_test",
  metadata: {
    courselit_checkout_id: "chk_test",
    courselit_school_id: "sch_test",
  },
};

function signature(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

describe.serial("school payment providers", () => {
  it("creates and verifies a Stripe checkout", async () => {
    const originalFetch = globalThis.fetch;
    let request: RequestInit | undefined;
    try {
      globalThis.fetch = (async (_input, init) => {
        request = init;
        return new Response(
          JSON.stringify({ id: "cs_test", url: "https://checkout.stripe.test/cs_test" }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const provider = paymentProviderFromSettings({
        provider: "stripe",
        stripe: { secretKey: "sk_test", webhookSecret: "whsec_test" },
      });
      expect(provider).not.toBeNull();
      const checkout = await provider!.createCheckout(checkoutInput);
      expect(checkout).toMatchObject({
        checkoutId: "cs_test",
        checkoutUrl: "https://checkout.stripe.test/cs_test",
        checkoutData: null,
      });
      const body = new URLSearchParams(String(request?.body));
      expect(body.get("mode")).toBe("payment");
      expect(body.get("line_items[0][price_data][unit_amount]")).toBe("2500");
      expect(body.get("metadata[courselit_checkout_id]")).toBe("chk_test");

      const now = new Date("2026-09-08T00:00:00.000Z");
      const rawBody = JSON.stringify({
        id: "evt_stripe",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test",
            payment_intent: "pi_test",
            amount_total: 2500,
            currency: "usd",
            metadata: checkoutInput.metadata,
          },
        },
      });
      provider!.verifyWebhook(
        rawBody,
        {
          "stripe-signature": `t=${Math.floor(now.getTime() / 1000)},v1=${signature("whsec_test", `${Math.floor(now.getTime() / 1000)}.${rawBody}`)}`,
        },
        now,
      );
      expect(provider!.parseWebhook(rawBody, {})).toMatchObject({
        eventId: "evt_stripe",
        eventType: "payment.succeeded",
        data: {
          payment_id: "pi_test",
          amount: 2500,
          currency: "USD",
          metadata: checkoutInput.metadata,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses production-shaped Lemon Squeezy checkout metadata and signatures", async () => {
    const originalFetch = globalThis.fetch;
    let request: RequestInit | undefined;
    try {
      globalThis.fetch = (async (_input, init) => {
        request = init;
        return new Response(
          JSON.stringify({
            data: {
              id: "lem_checkout",
              attributes: { url: "https://lemonsqueezy.test/checkout" },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }) as typeof fetch;

      const provider = paymentProviderFromSettings({
        provider: "lemonsqueezy",
        lemonsqueezy: {
          apiKey: "lem_key",
          storeId: "store_1",
          oneTimeVariantId: "variant_one_time",
          monthlyVariantId: "variant_monthly",
          yearlyVariantId: "variant_yearly",
          webhookSecret: "lem_webhook",
        },
      });
      expect(provider).not.toBeNull();
      const checkout = await provider!.createCheckout({
        ...checkoutInput,
        paymentPlan: {
          ...checkoutInput.paymentPlan,
          kind: "subscription",
          billingInterval: "year",
        },
      });
      expect(checkout.checkoutUrl).toBe("https://lemonsqueezy.test/checkout");
      expect((request?.headers as Record<string, string>)["X-Version"]).toBe("2023-06-30");
      const body = JSON.parse(String(request?.body)) as {
        data: { attributes: { checkout_data: { custom: Record<string, string> }; product_options: { enabled_variants: string[] } } };
      };
      expect(body.data.attributes.checkout_data.custom).toEqual(checkoutInput.metadata);
      expect(body.data.attributes.product_options.enabled_variants).toEqual(["variant_yearly"]);

      const rawBody = JSON.stringify({
        meta: {
          event_name: "subscription_payment_success",
          custom_data: checkoutInput.metadata,
          event_id: "lem_evt",
        },
        data: {
          id: "lem_order",
          attributes: { subscription_id: "lem_sub", total: 2500, currency: "usd" },
        },
      });
      provider!.verifyWebhook(rawBody, { "x-signature": signature("lem_webhook", rawBody) }, new Date());
      expect(provider!.parseWebhook(rawBody, {})).toMatchObject({
        eventId: "lem_evt",
        eventType: "payment.succeeded",
        data: {
          payment_id: "lem_order",
          subscription_id: "lem_sub",
          checkout_id: "chk_test",
          amount: 2500,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("creates Razorpay orders/subscriptions and verifies webhook signatures", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    try {
      globalThis.fetch = (async (input, init) => {
        const url = String(input);
        calls.push({ url, body: JSON.parse(String(init?.body)) as Record<string, unknown> });
        const response = url.endsWith("/plans")
          ? { id: "plan_test" }
          : url.endsWith("/subscriptions")
            ? { id: "sub_test" }
            : { id: "order_test" };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch;

      const provider = paymentProviderFromSettings({
        provider: "razorpay",
        razorpay: {
          keyId: "rzp_test",
          keySecret: "rzp_secret",
          webhookSecret: "rzp_webhook",
        },
      });
      expect(provider).not.toBeNull();
      const order = await provider!.createCheckout(checkoutInput);
      expect(order.checkoutData).toMatchObject({ provider: "razorpay", orderId: "order_test", publicKey: "rzp_test" });
      const subscription = await provider!.createCheckout({
        ...checkoutInput,
        paymentPlan: {
          ...checkoutInput.paymentPlan,
          kind: "subscription",
          billingInterval: "year",
        },
      });
      expect(subscription.checkoutData).toMatchObject({ provider: "razorpay", subscriptionId: "sub_test" });
      expect(calls[0]?.url).toEndWith("/orders");
      expect(calls[1]?.url).toEndWith("/plans");
      expect(calls[2]?.url).toEndWith("/subscriptions");
      expect(calls[2]?.body.total_count).toBe(10);

      const rawBody = JSON.stringify({
        id: "rzp_evt",
        event: "subscription.charged",
        payload: {
          payment: { entity: { id: "pay_test", amount: 2500, currency: "USD" } },
          subscription: { entity: { id: "sub_test", notes: checkoutInput.metadata } },
        },
      });
      provider!.verifyWebhook(rawBody, { "x-razorpay-signature": signature("rzp_webhook", rawBody) }, new Date());
      expect(provider!.parseWebhook(rawBody, {})).toMatchObject({
        eventId: "rzp_evt",
        eventType: "payment.succeeded",
        data: {
          payment_id: "pay_test",
          subscription_id: "sub_test",
          checkout_id: "chk_test",
          amount: 2500,
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
