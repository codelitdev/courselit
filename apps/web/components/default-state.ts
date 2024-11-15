import {
    Address,
    Profile,
    SiteInfo,
    Typeface,
    ServerConfig,
} from "@courselit/common-models";

export const defaultState: {
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Partial<Profile>;
    address: Address;
    typefaces: Typeface[];
    config: ServerConfig;
    [x: string]: any;
} = {
    siteinfo: {
        title: "",
        subtitle: "",
        logo: {
            file: "",
            thumbnail: "",
            caption: "",
        },
        currencyISOCode: "",
        paymentMethod: "",
        stripeKey: "",
        codeInjectionHead: "",
        codeInjectionBody: "",
        mailingAddress: "",
        hideCourseLitBranding: false,
        razorpayKey: "",
    },
    networkAction: false,
    profile: {
        name: "",
        id: "",
        fetched: false,
        purchases: [],
        email: "",
        bio: "",
        permissions: [],
        userId: "",
        avatar: {
            file: "",
            thumbnail: "",
            caption: "",
        },
    },
    message: {
        open: false,
        message: "",
        action: null,
    },
    theme: {},
    address: {
        backend: "",
        frontend: "",
    },
    typefaces: [],
    config: {
        turnstileSiteKey: "",
    },
};
