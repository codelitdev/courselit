export default interface SiteInfo {
    title: string;
    subtitle: string;
    logo: {
        mediaId?: string;
        file: string;
        thumbnail: string;
    };
    currencyISOCode?: string;
    paymentMethod?: string;
    stripePublishableKey?: string;
    codeInjectionHead?: string;
    codeInjectionBody?: string;
    stripeSecret?: string;
    paypalSecret?: string;
    paytmSecret?: string;
}
