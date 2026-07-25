import { Constants, UIConstants } from "@courselit/common-models";
import PayPalPayment from "../paypal-payment";

describe("PayPalPayment", () => {
    const siteinfo = {
        paymentMethod: UIConstants.PAYMENT_METHOD_PAYPAL,
        currencyISOCode: "usd",
        paypalClientId: "client-id",
        paypalClientSecret: "client-secret",
        paypalProductId: "product-id",
        paypalMonthlyPlanId: "monthly-plan-id",
        paypalYearlyPlanId: "yearly-plan-id",
    };

    it("requires PayPal credentials and template ids during setup", async () => {
        const payment = new PayPalPayment({
            ...siteinfo,
            paypalProductId: undefined,
        });

        await expect(payment.setup()).rejects.toThrow();
    });

    it("accepts one-time capture completion events with metadata", async () => {
        const payment = await new PayPalPayment(siteinfo as any).setup();

        await expect(
            payment.verify({
                event_type: "PAYMENT.CAPTURE.COMPLETED",
                resource: {
                    status: "COMPLETED",
                    custom_id: JSON.stringify({
                        membershipId: "membership-1",
                        invoiceId: "invoice-1",
                    }),
                },
            }),
        ).resolves.toBe(true);
    });

    it("accepts recurring sale completion events with metadata", async () => {
        const payment = await new PayPalPayment(siteinfo as any).setup();

        await expect(
            payment.verify({
                event_type: "PAYMENT.SALE.COMPLETED",
                resource: {
                    custom: JSON.stringify({
                        membershipId: "membership-1",
                    }),
                },
            }),
        ).resolves.toBe(true);
    });

    it("extracts metadata from custom_id or custom fields", async () => {
        const payment = await new PayPalPayment(siteinfo as any).setup();

        expect(
            payment.getMetadata({
                resource: {
                    custom_id: JSON.stringify({
                        membershipId: "membership-1",
                        invoiceId: "invoice-1",
                    }),
                },
            }),
        ).toEqual({
            membershipId: "membership-1",
            invoiceId: "invoice-1",
        });

        expect(
            payment.getMetadata({
                resource: {
                    custom: JSON.stringify({
                        membershipId: "membership-2",
                    }),
                },
            }),
        ).toEqual({
            membershipId: "membership-2",
        });
    });

    it("returns recurring subscription ids from billing agreement ids", async () => {
        const payment = await new PayPalPayment(siteinfo as any).setup();

        expect(
            payment.getSubscriptionId({
                resource: {
                    billing_agreement_id: "subscription-1",
                },
            }),
        ).toBe("subscription-1");
    });

    it("builds approval urls for one-time and recurring payments", async () => {
        const payment = await new PayPalPayment(siteinfo as any).setup();
        const paypalFetchSpy = jest
            .spyOn(payment as any, "paypalFetch")
            .mockResolvedValue({
                links: [
                    { rel: "approve", href: "https://paypal.test/approve" },
                ],
            });

        await expect(
            payment.initiate({
                metadata: {
                    membershipId: "membership-1",
                    invoiceId: "invoice-1",
                    currencyISOCode: "usd",
                    domainName: "school.example.com",
                },
                paymentPlan: {
                    type: Constants.PaymentPlanType.ONE_TIME,
                    oneTimeAmount: 99,
                } as any,
                product: {
                    id: "course-1",
                    title: "Course 1",
                    type: Constants.MembershipEntityType.COURSE,
                },
                origin: "https://school.example.com",
            }),
        ).resolves.toBe("https://paypal.test/approve");

        await expect(
            payment.initiate({
                metadata: {
                    membershipId: "membership-1",
                    invoiceId: "invoice-1",
                    currencyISOCode: "usd",
                },
                paymentPlan: {
                    type: Constants.PaymentPlanType.SUBSCRIPTION,
                    subscriptionMonthlyAmount: 19,
                } as any,
                product: {
                    id: "course-1",
                    title: "Course 1",
                    type: Constants.MembershipEntityType.COURSE,
                },
                origin: "https://school.example.com",
            }),
        ).resolves.toBe("https://paypal.test/approve");

        expect(paypalFetchSpy).toHaveBeenCalledTimes(2);
    });
});
