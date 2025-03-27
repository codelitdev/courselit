import { Constants, SiteInfo, UIConstants } from "@courselit/common-models";
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

    async verify(event) {
        if (!event) {
            return false;
        }
        if (
            event.event === "order.paid" &&
            event.payload.order.entity.notes.membershipId
        ) {
            return true;
        }
        if (
            event.event === "subscription.charged" &&
            event.payload.subscription.entity.notes.membershipId
        ) {
            return true;
        }
        return false;
    }

    getMetadata(event: any) {
        if (event.event === "order.paid") {
            return event.payload.order.entity.notes;
        } else {
            return event.payload.subscription.entity.notes;
        }
    }

    getPaymentIdentifier(event: any) {
        // if (
        //     event.event === "order.paid"
        // ) {
        //     return event.payload.order.entity.id;
        // }
        // if (
        //     event.event === "subscription.charged"
        // ) {
        //     return event.payload.subscription.entity.id;
        // }
        return event.payload.payment.entity.id;
    }

    getName() {
        return this.name;
    }

    async getCurrencyISOCode() {
        return this.siteinfo.currencyISOCode!;
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
            if (
                paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION ||
                paymentPlan.type === Constants.PaymentPlanType.EMI
            ) {
                this.razorpay.plans.create(
                    {
                        period: paymentPlan.subscriptionYearlyAmount
                            ? "yearly"
                            : "monthly",
                        interval: 1,
                        item: {
                            name: product.title,
                            amount: unit_amount,
                            currency:
                                this.siteinfo.currencyISOCode?.toUpperCase(),
                        },
                        notes: {
                            ...metadata,
                        },
                    },
                    (err, plan) => {
                        if (err) {
                            reject(
                                new Error(
                                    `Error creating plan on Razorpay: ${err.error.description}`,
                                ),
                            );
                        }
                        this.razorpay.subscriptions.create(
                            {
                                plan_id: plan.id,
                                total_count:
                                    paymentPlan.type ===
                                    Constants.PaymentPlanType.EMI
                                        ? paymentPlan.emiTotalInstallments
                                        : paymentPlan.subscriptionYearlyAmount
                                          ? 10
                                          : 120, // Subscribe for 10 years
                                customer_notify: 1,
                                // start_at: Math.floor(Date.now() / 1000) + 120, // 2 minutes from now
                                // end_at:
                                //     paymentPlan.type ===
                                //     Constants.PaymentPlanType.SUBSCRIPTION
                                //         ? Math.floor(Date.now() / 1000) +
                                //           157680000 // 5 years from now
                                //         : undefined,
                                notes: {
                                    ...metadata,
                                },
                            },
                            (err, subscription) => {
                                if (err) {
                                    reject(new Error(err.error.description));
                                }
                                resolve(subscription);
                            },
                        );
                    },
                );
            } else {
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
                            reject(
                                new Error(
                                    `Error creating plan on Razorpay: ${err.error.description}`,
                                ),
                            );
                        }
                        resolve(order);
                    },
                );
            }
        });
    }

    async cancel(id: string) {
        try {
            let subscription = await this.razorpay.subscriptions.fetch(id);
            if (
                subscription &&
                !["cancelled", "completed", "expired"].includes(
                    subscription.status,
                )
            ) {
                subscription = await this.razorpay.subscriptions.cancel(id);
            }
            return subscription;
        } catch (err) {
            throw new Error(`Failed to cancel subscription: ${err.message}`);
        }
    }

    getSubscriptionId(event: any): string {
        return event.payload.subscription.entity.id;
    }

    async validateSubscription(subscriptionId: string): Promise<boolean> {
        const subscription =
            await this.razorpay.subscriptions.fetch(subscriptionId);
        return subscription.status === "active";
    }
}
