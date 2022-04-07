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
      name: null,
      id: null,
      fetched: false,
      purchases: [],
      email: null,
      bio: null,
      permissions: [],
      userId: null,
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
      domain: "",
    },
};
