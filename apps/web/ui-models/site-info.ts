export default interface SiteInfo {
    title: string;
    subtitle: string;
    logopath: {
        mediaId?: string;
        file: string;
        thumbnail: string;
    };
    currencyUnit?: string;
    currencyISOCode?: string;
    paymentMethod?: string;
    stripePublishableKey?: string;
    codeInjectionHead?: string;
    stripeSecret?: string;
    paypalSecret?: string;
    paytmSecret?: string;
}
