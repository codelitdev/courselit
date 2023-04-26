export default {
    auth: {
        guest: true,
        checked: false,
    },
    siteinfo: {
        title: "",
        subtitle: "",
        logo: {
            file: "",
            thumbnail: "",
        },
        currencyISOCode: "",
        paymentMethod: "",
        stripePublishableKey: "",
        codeInjectionHead: "",
        codeInjectionBody: "",
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
    featureFlags: [],
    //widgetsData: {},
};
