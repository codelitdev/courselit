/**
 * The events each payment provider must send for purchases, renewals, refunds
 * and cancellations to reach CourseLit. Mirrors what the API handles.
 */
export const PAYMENT_WEBHOOK_EVENTS = {
  stripe: [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "invoice.paid",
    "invoice.payment_failed",
    "charge.refunded",
    "charge.dispute.created",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
  ],
  lemonsqueezy: [
    "order_created",
    "order_refunded",
    "subscription_created",
    "subscription_updated",
    "subscription_cancelled",
    "subscription_resumed",
    "subscription_expired",
    "subscription_paused",
    "subscription_unpaused",
    "subscription_payment_success",
    "subscription_payment_failed",
    "subscription_payment_recovered",
    "subscription_payment_refunded",
  ],
  razorpay: [
    "order.paid",
    "payment.failed",
    "payment.refunded",
    "refund.processed",
    "payment.dispute.created",
    "subscription.charged",
    "subscription.cancelled",
    "subscription.halted",
    "subscription.completed",
  ],
} as const satisfies Record<"stripe" | "lemonsqueezy" | "razorpay", readonly string[]>;
