import Action from "./action";
declare const reducer: (state: {
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
}, action: Action) => any;
export default reducer;
//# sourceMappingURL=reducer.d.ts.map