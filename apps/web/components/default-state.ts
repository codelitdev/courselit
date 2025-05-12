import {
    Address,
    Profile,
    SiteInfo,
    Typeface,
    ServerConfig,
} from "@courselit/common-models";
import { themes } from "@courselit/page-primitives";
import type { UITheme } from "@models/ui-theme";

export const defaultState: {
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Partial<Profile>;
    address: Address;
    typefaces: Typeface[];
    config: ServerConfig;
    theme: UITheme;
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
        themeId: "",
        name: "",
        theme: themes.find((theme) => theme.id === "classic")?.styles!,
    },
};
