import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import {
    Constants,
    PaymentPlan,
    SiteInfo,
    UIConstants,
} from "@courselit/common-models";
import { getUnitAmount } from "./helpers";
import MembershipModel, { InternalMembership } from "@models/Membership";
import PaymentPlanModel from "@models/PaymentPlan";
import Invoice from "@models/Invoice";
import { error } from "@/services/logger";

const LEMON_SQUEEZY_API_VERSION = "2023-06-30";
const LEMON_SQUEEZY_BASE_URL = "https://api.lemonsqueezy.com/v1";

export default class LemonSqueezyPayment implements Payment {
    public siteinfo: SiteInfo;
    public name: string;
    private apiKey: string;
    // private webhookSecret: string;

    constructor(siteinfo: SiteInfo) {
        this.siteinfo = siteinfo;
        this.name = UIConstants.PAYMENT_METHOD_LEMONSQUEEZY;
    }

    async setup() {
        if (!this.siteinfo.currencyISOCode) {
            throw new Error(responses.currency_iso_not_set);
        }

        if (
            !this.siteinfo.lemonsqueezyKey ||
            !this.siteinfo.lemonsqueezyStoreId ||
            !this.siteinfo.lemonsqueezyOneTimeVariantId ||
            !this.siteinfo.lemonsqueezySubscriptionMonthlyVariantId ||
            !this.siteinfo.lemonsqueezySubscriptionYearlyVariantId
        ) {
            throw new Error(
                `${this.name} ${responses.payment_invalid_settings}`,
            );
        }

        this.apiKey = this.siteinfo.lemonsqueezyKey;
        // this.webhookSecret = this.siteinfo.lemonsqueezyWebhookSecret;

        return this;
    }

    async initiate({ metadata, paymentPlan, product, origin }: InitiateProps) {
        const unitAmount = getUnitAmount(paymentPlan) * 100;
        let variantId;

        switch (paymentPlan.type) {
            case Constants.PaymentPlanType.SUBSCRIPTION:
                variantId =
                    this.siteinfo.lemonsqueezySubscriptionMonthlyVariantId;
                if (paymentPlan.subscriptionYearlyAmount) {
                    variantId =
                        this.siteinfo.lemonsqueezySubscriptionYearlyVariantId;
                }
                break;
            case Constants.PaymentPlanType.EMI:
                variantId =
                    this.siteinfo.lemonsqueezySubscriptionMonthlyVariantId;
                break;
            default:
                variantId = this.siteinfo.lemonsqueezyOneTimeVariantId;
                break;
        }
        const store = await this.getStore(this.siteinfo.lemonsqueezyStoreId!);

        const payload = {
            data: {
                type: "checkouts",
                attributes: {
                    custom_price: unitAmount,
                    checkout_options: {
                        embed: true,
                        media: false,
                        logo: false,
                    },
                    checkout_data: {
                        custom: {
                            ...metadata,
                        },
                    },
                    product_options: {
                        name: product.title,
                        enabled_variants: [variantId],
                        redirect_url: `${origin}/checkout/verify?id=${metadata.invoiceId}`,
                        receipt_button_text: "Return to Site",
                        receipt_thank_you_note: "Thank you for your purchase!",
                    },
                    expires_at: new Date(
                        Date.now() + 30 * 60 * 1000,
                    ).toISOString(), // 30 min expiry
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: this.siteinfo.lemonsqueezyStoreId,
                        },
                    },
                    variant: {
                        data: { type: "variants", id: variantId },
                    },
                },
            },
        };

        const response = await fetch(`${LEMON_SQUEEZY_BASE_URL}/checkouts`, {
            method: "POST",
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(
                `Lemon Squeezy error: ${error.errors?.[0]?.detail}`,
            );
        }

        const { data } = await response.json();
        return data.attributes.url; // Return checkout URL for redirection
    }

    async getCurrencyISOCode() {
        const store = await this.getStore(this.siteinfo.lemonsqueezyStoreId!);
        return store.attributes.currency.toLowerCase();
    }

    async verify(event: any) {
        // if (!this.verifyWebhookSignature(event)) return false;

        const eventType = event.meta.event_name;
        const attributes = event.data.attributes;

        switch (eventType) {
            case "order_created":
                const price = await this.getPrice(
                    attributes.first_order_item.price_id,
                );
                return price?.attributes.category === "one_time";
            case "subscription_payment_success":
                return true;
            case "subscription_resumed":
                await this.cancelSubscriptionForAllPaidEMIPlan(event);
                return false;
            default:
                return false;
        }
    }

    private async cancelSubscriptionForAllPaidEMIPlan(event) {
        const metadata = this.getMetadata(event);
        const membership: InternalMembership | null =
            await MembershipModel.findOne({
                membershipId: metadata.membershipId,
            });
        if (membership) {
            const paymentPlan: PaymentPlan | null =
                await PaymentPlanModel.findOne({
                    planId: membership.paymentPlanId,
                    domain: membership.domain,
                });
            if (
                paymentPlan &&
                paymentPlan.type === Constants.PaymentPlanType.EMI
            ) {
                const paidInvoicesCount = await Invoice.countDocuments({
                    domain: membership.domain,
                    membershipId: membership.membershipId,
                    status: Constants.InvoiceStatus.PAID,
                    membershipSessionId: membership.sessionId,
                });
                if (paidInvoicesCount >= paymentPlan.emiTotalInstallments!) {
                    try {
                        await this.cancel(membership.subscriptionId!);
                    } catch (err) {
                        error(`Error cancelling Lemonsqueezy subscription`, {
                            event,
                        });
                    }
                }
            }
        }
    }

    getPaymentIdentifier(event: any) {
        return event.data.id;
    }

    getMetadata(event: any) {
        return event.meta.custom_data || {};
    }

    getName() {
        return this.name;
    }

    async cancel(subscriptionId: string) {
        const response = await fetch(
            `${LEMON_SQUEEZY_BASE_URL}/subscriptions/${subscriptionId}`,
            {
                method: "DELETE",
                headers: this.getHeaders(),
            },
        );

        if (!response.ok) {
            throw new Error("Failed to cancel subscription");
        }

        return true;
    }

    getSubscriptionId(event: any): string {
        return event.data.attributes.subscription_id;
    }

    async validateSubscription(subscriptionId: string) {
        const response = await fetch(
            `${LEMON_SQUEEZY_BASE_URL}/subscriptions/${subscriptionId}`,
            { headers: this.getHeaders() },
        );

        if (!response.ok) return false;

        const { data } = await response.json();
        return data.attributes.status === "active";
    }

    private getHeaders() {
        return {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${this.apiKey}`,
            "X-Version": LEMON_SQUEEZY_API_VERSION,
        };
    }

    private async getPrice(priceId: number) {
        const response = await fetch(
            `${LEMON_SQUEEZY_BASE_URL}/prices/${priceId}`,
            { headers: this.getHeaders() },
        );

        if (!response.ok) return null;

        const { data } = await response.json();
        return data;
    }

    private async getStore(storeId: string) {
        const response = await fetch(
            `${LEMON_SQUEEZY_BASE_URL}/stores/${storeId}`,
            { headers: this.getHeaders() },
        );

        if (!response.ok) return null;

        const { data } = await response.json();
        return data;
    }

    // private verifyWebhookSignature(event: any) {
    //     const signature = event.meta.signature;
    //     const payload = JSON.stringify(event);

    //     const hmac = crypto.createHmac("sha256", this.webhookSecret);
    //     const digest = hmac.update(payload).digest("hex");

    //     return crypto.timingSafeEqual(
    //         Buffer.from(signature),
    //         Buffer.from(digest)
    //     );
    // }
}
