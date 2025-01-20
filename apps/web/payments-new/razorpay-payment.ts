import { SiteInfo, UIConstants } from "@courselit/common-models";
import Payment, { InitiateProps } from "./payment";
import { responses } from "@config/strings";
import Razorpay from "razorpay";
import { getUnitAmount } from "./helpers";

const {
    payment_invalid_settings: paymentInvalidSettings,
    currency_iso_not_set: currencyISONotSet,
} = responses;

export default class RazorpayPayment implements Payment {
    public siteinfo: SiteInfo;
    public name: string;
    public razorpay: any;

    constructor(siteinfo: SiteInfo) {
        this.siteinfo = siteinfo;
        this.name = UIConstants.PAYMENT_METHOD_RAZORPAY;
    }

    async setup() {
        if (!this.siteinfo.currencyISOCode) {
            throw new Error(currencyISONotSet);
        }

        if (!this.siteinfo.razorpayKey || !this.siteinfo.razorpaySecret) {
            throw new Error(`${this.name} ${paymentInvalidSettings}`);
        }

        this.razorpay = new Razorpay({
            key_id: this.siteinfo.razorpayKey,
            key_secret: this.siteinfo.razorpaySecret,
        });

        return this;
    }

    async initiate({ product, paymentPlan, metadata }: InitiateProps) {
        const order = await this.generateOrder({
            product,
            paymentPlan,
            metadata,
        });
        return order.id;
    }

    verify(event) {
        return event && event.event === "payment.authorized";
    }

    getMetadata(event: any) {
        return event.payload.payment.entity.notes;
    }

    getPaymentIdentifier(event: any) {
        return event.payload.payment.entity.notes.purchaseId;
    }

    getName() {
        return this.name;
    }

    private generateOrder({
        metadata,
        product,
        paymentPlan,
    }: Pick<InitiateProps, "product" | "paymentPlan" | "metadata">): Promise<{
        id: string;
    }> {
        return new Promise((resolve, reject) => {
            const unit_amount = getUnitAmount(paymentPlan) * 100;
            this.razorpay.orders.create(
                {
                    amount: unit_amount,
                    currency: this.siteinfo.currencyISOCode?.toUpperCase(),
                    notes: {
                        ...metadata,
                    },
                },
                (err, order) => {
                    if (err) {
                        reject(new Error(err.error.description));
                    }
                    resolve(order);
                },
            );
        });
    }

    cancel(id: string) {
        throw new Error("Method not implemented.");
    }

    getSubscriptionId(event: any): string {
        throw new Error("Method not implemented.");
    }

    validateSubscription(subscriptionId: string): boolean {
        throw new Error("Method not implemented.");
    }
}
