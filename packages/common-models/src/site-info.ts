import Media from "./media";
import { PaymentMethod } from "./payment-method";

export default interface SiteInfo {
    title?: string;
    subtitle?: string;
    logo?: Partial<Media>;
    currencyISOCode?: string;
    paymentMethod?: PaymentMethod;
    stripeKey?: string;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    stripeSecret?: string;
    stripeWebhookSecret?: string;
    paypalSecret?: string;
    paytmSecret?: string;
    mailingAddress?: string;
    hideCourseLitBranding?: boolean;
    razorpayKey?: string;
    razorpaySecret?: string;
    razorpayWebhookSecret?: string;
}
