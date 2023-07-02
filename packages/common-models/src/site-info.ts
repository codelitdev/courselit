import Media from "./media";
import { Typeface } from "./typeface";

export default interface SiteInfo {
    title: string;
    subtitle: string;
    logo: Media;
    currencyISOCode?: string;
    paymentMethod?: string;
    stripePublishableKey?: string;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    stripeSecret?: string;
    paypalSecret?: string;
    paytmSecret?: string;
    typefaces: Typeface[];
    draftTypefaces: Typeface[];
}
