import { combineReducers } from "redux";
import {
  SIGN_IN,
  SIGN_OUT,
  NETWORK_ACTION,
  PROFILE_AVAILABLE,
  PROFILE_CLEAR,
  SITEINFO_AVAILABLE,
  AUTH_CHECKED,
  SET_MESSAGE,
  CLEAR_MESSAGE,
  CUSTOMISATIONS_AVAILABLE
} from "./actionTypes.js";
import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH,
  GENERIC_CURRENCY_UNIT,
  GENERIC_COPYRIGHT_TEXT,
  GENERIC_ABOUT_TEXT,
  GENERIC_STRIPE_PUBLISHABLE_KEY_TEXT,
  GENERIC_CURRENCY_ISO_CODE,
  GENERIC_PAYMENT_METHOD
} from "../config/strings.js";

const initialState = {
  auth: {
    guest: true,
    token: null,
    userid: null,
    checked: false
  },
  siteinfo: {
    title: GENERIC_TITLE,
    subtitle: GENERIC_SUBTITLE,
    logopath: GENERIC_LOGO_PATH,
    currencyUnit: GENERIC_CURRENCY_UNIT,
    currencyISOCode: GENERIC_CURRENCY_ISO_CODE,
    copyrightText: GENERIC_COPYRIGHT_TEXT,
    about: GENERIC_ABOUT_TEXT,
    paymentMethod: GENERIC_PAYMENT_METHOD,
    stripePublishableKey: GENERIC_STRIPE_PUBLISHABLE_KEY_TEXT
  },
  networkAction: false,
  profile: {
    isCreator: false,
    name: null,
    id: null,
    fetched: false,
    isAdmin: false,
    purchases: [],
    email: null
  },
  message: {
    open: false,
    message: "",
    action: null
  },
  customisations: {
    themePrimaryColor: '',
    themeSecondaryColor: '',
    codeInjectionHead: ''
  }
};

function authReducer(state = initialState.auth, action) {
  switch (action.type) {
    case SIGN_IN:
      return {
        guest: false,
        token: action.token,
        userid: action.userid,
        checked: true
      };
    case SIGN_OUT:
      return initialState.auth;
    case AUTH_CHECKED:
      return Object.assign({}, state, { checked: true });
    default:
      return state;
  }
}

function siteinfoReducer(state = initialState.siteinfo, action) {
  switch (action.type) {
    case SITEINFO_AVAILABLE:
      try {
        return {
          title: action.siteinfo.title || initialState.siteinfo.title,
          subtitle: action.siteinfo.subtitle || initialState.siteinfo.subtitle,
          logopath: action.siteinfo.logopath || initialState.siteinfo.logopath,
          currencyUnit:
            action.siteinfo.currencyUnit || initialState.siteinfo.currencyUnit,
          currencyISOCode:
            action.siteinfo.currencyISOCode ||
            initialState.siteinfo.currencyISOCode,
          copyrightText:
            action.siteinfo.copyrightText ||
            initialState.siteinfo.copyrightText,
          about: action.siteinfo.about || initialState.siteinfo.about,
          paymentMethod:
            action.siteinfo.paymentMethod ||
            initialState.siteinfo.paymentMethod,
          stripePublishableKey:
            action.siteinfo.stripePublishableKey ||
            initialState.siteinfo.stripePublishableKey
        };
      } catch (e) {
        return state;
      }
    default:
      return state;
  }
}

function networkActionReducer(state = initialState.networkAction, action) {
  switch (action.type) {
    case NETWORK_ACTION:
      return action.flag;
    default:
      return state;
  }
}

function profileReducer(state = initialState.profile, action) {
  switch (action.type) {
    case PROFILE_AVAILABLE:
      return {
        id: action.profile && action.profile.id,
        name: action.profile && action.profile.name,
        isCreator: (action.profile && action.profile.isCreator) || false,
        fetched: true,
        isAdmin: (action.profile && action.profile.isAdmin) || false,
        purchases: (action.profile && action.profile.purchases) || [],
        email: action.profile && action.profile.email
      };
    case PROFILE_CLEAR:
      return initialState.profile;
    default:
      return state;
  }
}

function appMessageReducer(state = initialState.message, action) {
  switch (action.type) {
    case SET_MESSAGE:
      return {
        message: action.message.message,
        action: action.message.action,
        open: true
      };
    case CLEAR_MESSAGE:
      return initialState.message;
    default:
      return state;
  }
}

function customisationsReducer(state = initialState.customisations, action) {
  switch (action.type) {
    case CUSTOMISATIONS_AVAILABLE:
      return {
        themePrimaryColor: action.customisations.themePrimaryColor,
        themeSecondaryColor: action.customisations.themeSecondaryColor,
        codeInjectionHead: action.customisations.codeInjectionHead
      }
    default:
      return state;
  }
}

export default combineReducers({
  auth: authReducer,
  siteinfo: siteinfoReducer,
  networkAction: networkActionReducer,
  profile: profileReducer,
  message: appMessageReducer,
  customisations: customisationsReducer
});
