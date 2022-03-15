import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH,
  GENERIC_CURRENCY_UNIT,
  GENERIC_STRIPE_PUBLISHABLE_KEY_TEXT,
  GENERIC_CURRENCY_ISO_CODE,
  GENERIC_PAYMENT_METHOD,
  GENERIC_CODE_INJECTION_HEAD,
} from "../ui-config/strings";

export default {
  auth: {
    guest: true,
    checked: false,
  },
  siteinfo: {
    title: GENERIC_TITLE,
    subtitle: GENERIC_SUBTITLE,
    logopath: {
      file: GENERIC_LOGO_PATH,
      thumbnail: GENERIC_LOGO_PATH,
    },
    currencyUnit: GENERIC_CURRENCY_UNIT,
    currencyISOCode: GENERIC_CURRENCY_ISO_CODE,
    paymentMethod: GENERIC_PAYMENT_METHOD,
    stripePublishableKey: GENERIC_STRIPE_PUBLISHABLE_KEY_TEXT,
    codeInjectionHead: GENERIC_CODE_INJECTION_HEAD,
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
