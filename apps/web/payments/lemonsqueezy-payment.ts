import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import { SiteInfo, UIConstants } from "@courselit/common-models";

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

    async initiate({ course, metadata, purchaseId }: InitiateProps) {
        const variantId = this.siteinfo.lemonsqueezyOneTimeVariantId;

        const payload = {
            data: {
                type: "checkouts",
                attributes: {
                    custom_price: course.cost * 100,
                    checkout_options: {
                        embed: true,
                        media: false,
                        logo: false,
                    },
                    checkout_data: {
                        custom: {
                            purchaseId,
                        },
                    },
                    product_options: {
                        name: course.title,
                        enabled_variants: [variantId],
                        redirect_url: `${metadata.successUrl}?id=${purchaseId}&source=${metadata.sourceUrl}`,
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

    verify(event: any) {
        // if (!this.verifyWebhookSignature(event)) return false;

        const eventType = event.meta.event_name;

        switch (eventType) {
            case "order_created":
                return true;
            default:
                return false;
        }
    }

    getPaymentIdentifier(event: any) {
        return event.meta.custom_data.purchaseId;
    }

    getMetadata(event: any) {
        return event.meta.custom_data || {};
    }

    getName() {
        return this.name;
    }

    private getHeaders() {
        return {
            Accept: "application/vnd.api+json",
            "Content-Type": "application/vnd.api+json",
            Authorization: `Bearer ${this.apiKey}`,
            "X-Version": LEMON_SQUEEZY_API_VERSION,
        };
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
