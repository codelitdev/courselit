import { Constants, SiteInfo, UIConstants } from "@courselit/common-models";
import Payment, { InitiateProps } from "./payment";
import { responses } from "../config/strings";
import { getUnitAmount } from "./helpers";
import { MercadoPagoConfig, Payment as MPPayment, Preference } from 'mercadopago';

const {
    payment_invalid_settings: paymentInvalidSettings,
    currency_iso_not_set: currencyISONotSet,
} = responses;

export default class MercadoPagoPayment implements Payment {
    public siteinfo: SiteInfo;
    public name: string;
    private client: MercadoPagoConfig;
    private mpPayment: MPPayment;
    private preference: Preference;

    constructor(siteinfo: SiteInfo) {
        this.siteinfo = siteinfo;
        this.name = UIConstants.PAYMENT_METHOD_MERCADOPAGO;
    }

    async setup() {
        if (!this.siteinfo.currencyISOCode) {
            console.error("Error: Currency ISO code not set");
            throw new Error(currencyISONotSet);
        }

        console.log("Mercado Pago setup - SiteInfo:", JSON.stringify({
            currencyISOCode: this.siteinfo.currencyISOCode,
            paymentMethod: this.siteinfo.paymentMethod,
            hasAccessToken: !!this.siteinfo.mercadopagoAccessToken
        }));

        if (!this.siteinfo.mercadopagoAccessToken) {
            console.error("Error: Mercado Pago access token not set");
            throw new Error(`${this.name} ${paymentInvalidSettings}`);
        }

        try {
            this.client = new MercadoPagoConfig({ 
                accessToken: this.siteinfo.mercadopagoAccessToken, 
                options: { timeout: 5000 }
            });

            this.mpPayment = new MPPayment(this.client);
            this.preference = new Preference(this.client);

            console.log("Mercado Pago setup successful");
            return this;
        } catch (error) {
            console.error("Error setting up Mercado Pago:", error);
            throw new Error(`${this.name} ${paymentInvalidSettings}: ${(error as Error).message}`);
        }
    }

    async initiate({ metadata, paymentPlan, product, origin }: InitiateProps) {
        const unit_amount = getUnitAmount(paymentPlan);
        
        try {
            console.log("Mercado Pago initiate - paymentPlan:", JSON.stringify(paymentPlan || {}, null, 2));
            console.log("Mercado Pago initiate - product:", JSON.stringify(product || {}, null, 2));
            
            const preferenceData = {
                items: [
                    {
                        id: product.id,
                        title: product.title,
                        quantity: 1,
                        unit_price: unit_amount,
                    }
                ],
                back_urls: {
                    success: `${origin}/checkout/verify?id=${metadata.invoiceId}`,
                    failure: `${origin}/checkout?type=${product.type}&id=${product.id}`,
                    pending: `${origin}/checkout?type=${product.type}&id=${product.id}`
                },
                auto_return: "approved",
                external_reference: JSON.stringify(metadata),
                ...(paymentPlan && paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION && {
                    payment_methods: {
                        installments: 1,
                        recurring: true
                    }
                }),
                ...(paymentPlan && paymentPlan.type === Constants.PaymentPlanType.EMI && {
                    payment_methods: {
                        installments: paymentPlan.emiTotalInstallments || 1
                    }
                }),
                metadata
            };

            const response = await this.preference.create({ body: preferenceData });
            
            // Return an object with both the ID and the URL
            return {
                id: response.id,
                url: response.init_point
            };
        } catch (error) {
            console.error("Error creating Mercado Pago preference:", error);
            throw new Error(`Error creating payment: ${(error as Error).message}`);
        }
    }

    async verify(event: any) {
        if (!event || !event.data || !event.data.id) {
            return false;
        }
        
        try {
            const paymentId = event.data.id;
            const response = await this.mpPayment.get({ id: paymentId });
            return response.status === 'approved';
        } catch (error) {
            console.error("Error verifying Mercado Pago payment:", error);
            return false;
        }
    }

    async getPaymentIdentifier(event: any) {
        const metadata = await this.getMetadata(event);
        console.log(metadata)
        return metadata.invoice_id;
    }

    async getMetadata(event: any) {
        try {   
            return (await this.mpPayment.get({ id: event.data.id })).metadata as unknown as Record<string, unknown>;
        } catch (e) {   
            console.error("Error parsing Mercado Pago metadata:", e);
            return {};
        }
    }

    getName() {
        return this.name;
    }

    async cancel(id: string) {
        if (!id) return;
        
        try {
            await this.mpPayment.cancel({ id });
        } catch (e) {
            console.error("Error canceling Mercado Pago payment:", e);
        }
    }

    getSubscriptionId(event: any): string {
        return '';
    }

    async validateSubscription(subscriptionId: string): Promise<boolean> {
        return false;
    }

    async getCurrencyISOCode() {
        return this.siteinfo.currencyISOCode!;
    }
}
