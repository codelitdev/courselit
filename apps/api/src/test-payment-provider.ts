import { createHash } from "node:crypto";
import type {
  NormalizedPaymentEvent,
  PaymentCheckoutInput,
  PaymentCheckoutResult,
  PaymentProvider,
} from "./payments.js";

/** A deterministic Stripe-shaped test double for checkout lifecycle tests. */
export class MemoryPaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  readonly checkouts: PaymentCheckoutInput[] = [];
  readonly cancelledSubscriptions: string[] = [];

  async createCheckout(input: PaymentCheckoutInput): Promise<PaymentCheckoutResult> {
    this.checkouts.push(input);
    const checkoutId = `stripe_checkout_${this.checkouts.length}`;
    return {
      checkoutId,
      checkoutUrl: `https://checkout.test/${checkoutId}`,
      checkoutData: null,
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    this.cancelledSubscriptions.push(providerSubscriptionId);
  }

  verifyWebhook(): void {}

  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): NormalizedPaymentEvent {
    const event = JSON.parse(rawBody) as { id?: unknown; type?: unknown; data?: unknown };
    const data = event.data && typeof event.data === "object" && !Array.isArray(event.data)
      ? event.data as Record<string, unknown>
      : {};
    return {
      eventId:
        typeof headers["stripe-event-id"] === "string"
          ? headers["stripe-event-id"]
          : typeof event.id === "string"
            ? event.id
            : createHash("sha256").update(rawBody).digest("hex"),
      eventType: typeof event.type === "string" ? event.type : "payment.ignored",
      data,
    };
  }
}
