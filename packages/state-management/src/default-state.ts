export default {
    auth: {
        guest: true,
        checked: false,
    },
    siteinfo: {
        title: "",
        subtitle: "",
        logopath: {
            file: "",
            thumbnail: "",
        },
        currencyUnit: "",
        currencyISOCode: "",
        paymentMethod: "",
        stripePublishableKey: "",
        codeInjectionHead: "",
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
    layout: {
        top: [],
        bottom: [],
        aside: [],
        footerLeft: [],
        footerRight: [],
    },
    navigation: [],
    address: {
        backend: "",
        frontend: "",
    },
    widgetsData: {},
};
