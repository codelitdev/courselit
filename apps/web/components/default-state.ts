import {
    Address,
    Profile,
    SiteInfo,
    Typeface,
    ServerConfig,
} from "@courselit/common-models";
import { Theme } from "@courselit/page-models";
import { themes } from "@courselit/page-primitives";

export const defaultState: {
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Partial<Profile>;
    address: Address;
    typefaces: Typeface[];
    config: ServerConfig;
    theme: Theme;
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
        lemonsqueezyStoreId: "",
        lemonsqueezyOneTimeVariantId: "",
        lemonsqueezySubscriptionMonthlyVariantId: "",
        lemonsqueezySubscriptionYearlyVariantId: "",
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
    address: {
        backend: "",
        frontend: "",
    },
    typefaces: [],
    config: {
        turnstileSiteKey: "",
        queueServer: "",
    },
    theme: {
        id: "",
        name: "",
        theme: themes.find((theme) => theme.id === "classic")?.theme!,
    },
};
