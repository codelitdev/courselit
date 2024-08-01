import { SiteInfo, UIConstants } from "@courselit/common-models";
import Payment, { InitiateProps } from "./payment";
import { responses } from "@config/strings";
import Razorpay from "razorpay";

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

    async initiate({ course, purchaseId }: InitiateProps) {
        const order = await this.generateOrder({ course, purchaseId });
        return order.id;
    }

    verify(event) {
        return event && event.event === "payment.authorized";
    }

    getPaymentIdentifier(event: any) {
        return event.payload.payment.entity.notes.purchaseId;
    }

    getName() {
        return this.name;
    }

    private generateOrder({
        course,
        purchaseId,
    }: Pick<InitiateProps, "course" | "purchaseId">): Promise<{ id: string }> {
        return new Promise((resolve, reject) => {
            this.razorpay.orders.create(
                {
                    amount: course.cost * 100,
                    currency: this.siteinfo.currencyISOCode?.toUpperCase(),
                    notes: {
                        purchaseId,
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
}
