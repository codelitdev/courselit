import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import Stripe from "stripe";
import { Constants, SiteInfo, UIConstants } from "@courselit/common-models";
import { getUnitAmount } from "./helpers";

const {
    payment_invalid_settings: paymentInvalidSettings,
    currency_iso_not_set: currencyISONotSet,
} = responses;

export default class StripePayment implements Payment {
    public siteinfo: SiteInfo;
    public name: string;
    public stripe: any;

    constructor(siteinfo: SiteInfo) {
        this.siteinfo = siteinfo;
        this.name = UIConstants.PAYMENT_METHOD_STRIPE;
    }

    async setup() {
        if (!this.siteinfo.currencyISOCode) {
            throw new Error(currencyISONotSet);
        }

        if (!this.siteinfo.stripeKey || !this.siteinfo.stripeSecret) {
            throw new Error(`${this.name} ${paymentInvalidSettings}`);
        }

        this.stripe = new Stripe(this.siteinfo.stripeSecret, {
            apiVersion: "2020-08-27",
        });

        return this;
    }

    async initiate({ metadata, paymentPlan, product }: InitiateProps) {
        const unit_amount = getUnitAmount(paymentPlan) * 100;
        const sessionPayload: any = {
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: this.siteinfo.currencyISOCode,
                        product_data: {
                            name: product.title,
                        },
                        unit_amount,
                        recurring:
                            paymentPlan.type ===
                            Constants.PaymentPlanType.SUBSCRIPTION
                                ? {
                                      interval:
                                          paymentPlan.subscriptionYearlyAmount
                                              ? "year"
                                              : "month",
                                  }
                                : undefined,
                    },
                    quantity: 1,
                },
            ],
            mode:
                paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION
                    ? "subscription"
                    : "payment",
            success_url: `${metadata.successUrl}?id=${metadata.membershipId}&source=${metadata.sourceUrl}`,
            cancel_url: metadata.cancelUrl,
            metadata: {
                purchaseId: metadata.membershipId,
            },
            allow_promotion_codes: true,
        };
        // if (paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION) {
        //     sessionPayload.line_items[0].price_data.recurring = {
        //         interval: paymentPlan.subscriptionYearlyAmount
        //             ? "year"
        //             : "month",
        //     };
        // }
        const session =
            await this.stripe.checkout.sessions.create(sessionPayload);

        return session.id;
    }

    verify(event: Stripe.Event) {
        return (
            event &&
            event.type === "checkout.session.completed" &&
            (event.data.object as any).payment_status === "paid"
        );
    }

    getPaymentIdentifier(event: Stripe.Event) {
        return (event.data.object as any).id;
    }

    getMetadata(event: Stripe.Event) {
        return (event.data.object as any).metadata;
    }

    getName() {
        return this.name;
    }
}
