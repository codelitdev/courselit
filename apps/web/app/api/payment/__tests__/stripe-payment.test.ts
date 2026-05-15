/**
 * @jest-environment node
 */

import StripePayment from "@/payments-new/stripe-payment";

const siteInfo = {
    currencyISOCode: "usd",
    stripeKey: "pk_test_123",
    stripeSecret: "sk_test_123",
    stripeWebhookSecret: "whsec_test_123",
};

const checkoutSessionCompleted = {
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: {
        object: {
            id: "cs_test_123",
            payment_status: "paid",
            metadata: {
                membershipId: "membership_123",
                invoiceId: "invoice_123",
            },
        },
    },
};

describe("StripePayment webhook verification", () => {
    it("accepts Stripe events with a valid signature over the raw body", async () => {
        const payment = (await new StripePayment(siteInfo).setup()) as any;
        const rawBody = JSON.stringify(checkoutSessionCompleted);
        const signature = payment.stripe.webhooks.generateTestHeaderString({
            payload: rawBody,
            secret: siteInfo.stripeWebhookSecret,
        });

        await expect(
            payment.verify(checkoutSessionCompleted, {
                rawBody,
                signature,
            }),
        ).resolves.toBe(true);
    });

    it("rejects events when the Stripe signature is missing", async () => {
        const payment = await new StripePayment(siteInfo).setup();
        const rawBody = JSON.stringify(checkoutSessionCompleted);

        await expect(
            payment.verify(checkoutSessionCompleted, {
                rawBody,
                signature: null,
            }),
        ).resolves.toBe(false);
    });

    it("rejects events when the raw body has been changed", async () => {
        const payment = (await new StripePayment(siteInfo).setup()) as any;
        const rawBody = JSON.stringify(checkoutSessionCompleted);
        const signature = payment.stripe.webhooks.generateTestHeaderString({
            payload: rawBody,
            secret: siteInfo.stripeWebhookSecret,
        });

        await expect(
            payment.verify(checkoutSessionCompleted, {
                rawBody: JSON.stringify({
                    ...checkoutSessionCompleted,
                    id: "evt_tampered",
                }),
                signature,
            }),
        ).resolves.toBe(false);
    });

    it("requires a Stripe webhook secret during setup", async () => {
        await expect(
            new StripePayment({
                ...siteInfo,
                stripeWebhookSecret: undefined,
            }).setup(),
        ).rejects.toThrow("stripe");
    });
});
