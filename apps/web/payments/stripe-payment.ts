import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import Stripe from "stripe";
import { SiteInfo, UIConstants } from "@courselit/common-models";

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

    async initiate({ course, metadata, purchaseId }: InitiateProps) {
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: this.siteinfo.currencyISOCode,
                        product_data: {
                            name: course.title,
                        },
                        unit_amount: course.cost * 100,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${metadata.successUrl}?id=${purchaseId}&source=${metadata.sourceUrl}`,
            cancel_url: metadata.cancelUrl,
            metadata: {
                purchaseId,
            },
            allow_promotion_codes: true,
        });

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
        return (event.data.object as any).metadata.purchaseId;
    }

    getName() {
        return this.name;
    }
}
