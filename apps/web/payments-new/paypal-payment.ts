import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import { Constants, SiteInfo, UIConstants } from "@courselit/common-models";
import { getUnitAmount } from "./helpers";

const LIVE_BASE_URL = "https://api-m.paypal.com";
const SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";

const {
    payment_invalid_settings: paymentInvalidSettings,
    currency_iso_not_set: currencyISONotSet,
} = responses;

type TokenCacheEntry = {
    accessToken: string;
    expiresAt: number;
    baseUrl: string;
};

const tokenCache = new Map<string, TokenCacheEntry>();

const buildCacheKey = (siteinfo: SiteInfo) =>
    `${siteinfo.paypalClientId}:${siteinfo.paypalClientSecret}`;

const encodeMetadata = (
    metadata: InitiateProps["metadata"] & { currencyISOCode?: string },
) =>
    JSON.stringify({
        membershipId: metadata.membershipId,
        invoiceId: metadata.invoiceId,
        currencyISOCode: metadata.currencyISOCode,
    });

const parseMetadata = (value?: string) => {
    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
};

export default class PayPalPayment implements Payment {
    public siteinfo: SiteInfo;
    public name: string;
    private accessToken?: string;
    private baseUrl?: string;

    constructor(siteinfo: SiteInfo) {
        this.siteinfo = siteinfo;
        this.name = UIConstants.PAYMENT_METHOD_PAYPAL;
    }

    async setup() {
        if (!this.siteinfo.currencyISOCode) {
            throw new Error(currencyISONotSet);
        }

        if (
            !this.siteinfo.paypalClientId ||
            !this.siteinfo.paypalClientSecret ||
            !this.siteinfo.paypalProductId ||
            !this.siteinfo.paypalMonthlyPlanId ||
            !this.siteinfo.paypalYearlyPlanId
        ) {
            throw new Error(`${this.name} ${paymentInvalidSettings}`);
        }

        return this;
    }

    async initiate({ metadata, paymentPlan, product, origin }: InitiateProps) {
        if (paymentPlan.type === Constants.PaymentPlanType.ONE_TIME) {
            return this.createOrder({ metadata, paymentPlan, product, origin });
        }

        return this.createSubscription({
            metadata,
            paymentPlan,
            product,
            origin,
        });
    }

    async verify(event: any) {
        if (!event?.event_type || !event?.resource) {
            return false;
        }

        if (
            event.event_type === "PAYMENT.CAPTURE.COMPLETED" &&
            event.resource.status === "COMPLETED"
        ) {
            return !!this.getMetadata(event).membershipId;
        }

        if (event.event_type === "PAYMENT.SALE.COMPLETED") {
            return !!this.getMetadata(event).membershipId;
        }

        return false;
    }

    getPaymentIdentifier(event: any) {
        return event?.resource?.id;
    }

    getMetadata(event: any) {
        if (event?.resource?.custom_id) {
            return parseMetadata(event.resource.custom_id);
        }

        if (event?.resource?.custom) {
            return parseMetadata(event.resource.custom);
        }

        return {};
    }

    getName() {
        return this.name;
    }

    async cancel(subscriptionId: string) {
        await this.paypalFetch(
            `/v1/billing/subscriptions/${subscriptionId}/cancel`,
            {
                method: "POST",
                body: JSON.stringify({
                    reason: "Cancelled by CourseLit",
                }),
            },
        );

        return true;
    }

    getSubscriptionId(event: any): string {
        return (
            event?.resource?.billing_agreement_id || event?.resource?.id || ""
        );
    }

    async validateSubscription(subscriptionId: string) {
        const subscription = await this.paypalFetch(
            `/v1/billing/subscriptions/${subscriptionId}`,
        );

        return subscription?.status === "ACTIVE";
    }

    async getCurrencyISOCode() {
        return this.siteinfo.currencyISOCode!;
    }

    async captureOrder(orderId: string) {
        const response = await this.paypalFetch(
            `/v2/checkout/orders/${orderId}/capture`,
            {
                method: "POST",
            },
        );

        return response;
    }

    private async createOrder({
        metadata,
        paymentPlan,
        product,
        origin,
    }: InitiateProps) {
        const unitAmount = this.formatAmount(getUnitAmount(paymentPlan));
        const returnUrl = new URL(
            `${origin}/api/payment/vendor/paypal/capture`,
        );
        returnUrl.searchParams.set("invoiceId", metadata.invoiceId);
        if (metadata.domainName) {
            returnUrl.searchParams.set("domainName", metadata.domainName);
        }

        const payload = {
            intent: "CAPTURE",
            purchase_units: [
                {
                    description: product.title,
                    custom_id: encodeMetadata(metadata),
                    invoice_id: metadata.invoiceId,
                    amount: {
                        currency_code:
                            this.siteinfo.currencyISOCode?.toUpperCase(),
                        value: unitAmount,
                        breakdown: {
                            item_total: {
                                currency_code:
                                    this.siteinfo.currencyISOCode?.toUpperCase(),
                                value: unitAmount,
                            },
                        },
                    },
                    items: [
                        {
                            name: product.title,
                            quantity: "1",
                            unit_amount: {
                                currency_code:
                                    this.siteinfo.currencyISOCode?.toUpperCase(),
                                value: unitAmount,
                            },
                        },
                    ],
                },
            ],
            application_context: {
                return_url: returnUrl.toString(),
                cancel_url: `${origin}/checkout?type=${product.type}&id=${product.id}`,
            },
        };

        const response = await this.paypalFetch("/v2/checkout/orders", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const approvalLink = response?.links?.find(
            (link: any) => link.rel === "approve",
        )?.href;

        if (!approvalLink) {
            throw new Error("PayPal approval URL not found");
        }

        return approvalLink;
    }

    private async createSubscription({
        metadata,
        paymentPlan,
        product,
        origin,
    }: InitiateProps) {
        const unitAmount = this.formatAmount(getUnitAmount(paymentPlan));
        const isYearly =
            paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION &&
            !!paymentPlan.subscriptionYearlyAmount;
        const isEmi = paymentPlan.type === Constants.PaymentPlanType.EMI;
        const planId = isYearly
            ? this.siteinfo.paypalYearlyPlanId
            : this.siteinfo.paypalMonthlyPlanId;
        const intervalUnit = isYearly ? "YEAR" : "MONTH";

        const billingCycle: any = {
            sequence: 1,
            tenure_type: "REGULAR",
            pricing_scheme: {
                fixed_price: {
                    currency_code: this.siteinfo.currencyISOCode?.toUpperCase(),
                    value: unitAmount,
                },
            },
        };

        if (isEmi) {
            billingCycle.total_cycles = paymentPlan.emiTotalInstallments;
        }

        const payload = {
            plan_id: planId,
            custom_id: encodeMetadata(metadata),
            plan: {
                product_id: this.siteinfo.paypalProductId,
                name: product.title,
                billing_cycles: [
                    {
                        ...billingCycle,
                        frequency: {
                            interval_unit: intervalUnit,
                            interval_count: 1,
                        },
                    },
                ],
            },
            application_context: {
                return_url: `${origin}/checkout/verify?id=${metadata.invoiceId}`,
                cancel_url: `${origin}/checkout?type=${product.type}&id=${product.id}`,
            },
        };

        const response = await this.paypalFetch("/v1/billing/subscriptions", {
            method: "POST",
            body: JSON.stringify(payload),
        });

        const approvalLink = response?.links?.find(
            (link: any) => link.rel === "approve",
        )?.href;

        if (!approvalLink) {
            throw new Error("PayPal approval URL not found");
        }

        return approvalLink;
    }

    private formatAmount(amount: number) {
        return amount.toFixed(2);
    }

    private async paypalFetch(path: string, init?: RequestInit) {
        await this.ensureAccessToken();

        const response = await fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.accessToken}`,
                ...(init?.headers || {}),
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(
                `PayPal error: ${response.status} ${response.statusText} ${error}`,
            );
        }

        if (response.status === 204) {
            return true;
        }

        return await response.json();
    }

    private async ensureAccessToken() {
        const cacheKey = buildCacheKey(this.siteinfo);
        const cached = tokenCache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            this.accessToken = cached.accessToken;
            this.baseUrl = cached.baseUrl;
            return;
        }

        const liveToken = await this.tryAuthenticate(LIVE_BASE_URL);
        const token =
            liveToken || (await this.tryAuthenticate(SANDBOX_BASE_URL));

        if (!token) {
            throw new Error("Failed to authenticate with PayPal");
        }

        this.accessToken = token.accessToken;
        this.baseUrl = token.baseUrl;

        tokenCache.set(cacheKey, token);
    }

    private async tryAuthenticate(baseUrl: string) {
        const basicToken = Buffer.from(
            `${this.siteinfo.paypalClientId}:${this.siteinfo.paypalClientSecret}`,
        ).toString("base64");

        const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${basicToken}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        if (!response.ok) {
            return null;
        }

        const result = await response.json();

        return {
            accessToken: result.access_token,
            expiresAt: Date.now() + (result.expires_in - 60) * 1000,
            baseUrl,
        } satisfies TokenCacheEntry;
    }
}
