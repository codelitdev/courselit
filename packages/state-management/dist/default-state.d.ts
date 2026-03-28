declare const _default: {
    auth: {
        guest: boolean;
        checked: boolean;
    };
    siteinfo: {
        title: string;
        subtitle: string;
        logo: {
            file: string;
            thumbnail: string;
            caption: string;
        };
        currencyISOCode: string;
        paymentMethod: string;
        stripeKey: string;
        codeInjectionHead: string;
        codeInjectionBody: string;
        mailingAddress: string;
        hideCourseLitBranding: boolean;
        razorpayKey: string;
    };
    networkAction: boolean;
    profile: {
        name: string;
        id: string;
        fetched: boolean;
        purchases: any[];
        email: string;
        bio: string;
        permissions: any[];
        userId: string;
        avatar: {
            file: string;
            thumbnail: string;
            caption: string;
        };
    };
    message: {
        open: boolean;
        message: string;
        action: any;
    };
    theme: {
        themeId: string;
        name: string;
        theme: {};
    };
    address: {
        backend: string;
        frontend: string;
    };
    typefaces: any[];
    config: {
        turnstileSiteKey: string;
    };
};
export default _default;
//# sourceMappingURL=default-state.d.ts.map