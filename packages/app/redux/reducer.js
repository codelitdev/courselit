import { decode } from "base-64";
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
  THEME_AVAILABLE,
  LAYOUT_AVAILABLE,
  NAVIGATION_AVAILABLE,
  SET_ADDRESS,
} from "./actionTypes.js";
import { HYDRATE } from "next-redux-wrapper";
import initialState from "./defaultState";

function authReducer(state = initialState.auth, action) {
  switch (action.type) {
    case SIGN_IN:
      return {
        guest: false,
        token: action.token,
        userid: action.userid,
        checked: true,
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
          paymentMethod:
            action.siteinfo.paymentMethod ||
            initialState.siteinfo.paymentMethod,
          stripePublishableKey:
            action.siteinfo.stripePublishableKey ||
            initialState.siteinfo.stripePublishableKey,
          themePrimaryColor:
            action.siteinfo.themePrimaryColor ||
            initialState.siteinfo.themePrimaryColor,
          themeSecondaryColor:
            action.siteinfo.themeSecondaryColor ||
            initialState.siteinfo.themeSecondaryColor,
          codeInjectionHead:
            decode(action.siteinfo.codeInjectionHead) ||
            initialState.siteinfo.codeInjectionHead,
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
        email: action.profile && action.profile.email,
        userId: action.profile && action.profile.userId,
        bio: action.profile && action.profile.bio,
      };
    case PROFILE_CLEAR:
      return initialState.profile;
    default:
      return state;
  }
}

function messageReducer(state = initialState.message, action) {
  switch (action.type) {
    case SET_MESSAGE:
      return {
        message: action.message.message,
        action: action.message.action,
        open: true,
      };
    case CLEAR_MESSAGE:
      return initialState.message;
    default:
      return state;
  }
}

function themeReducer(state = initialState.theme, action) {
  let styles;

  switch (action.type) {
    case THEME_AVAILABLE:
      try {
        styles = JSON.parse(action.theme.styles);
      } catch (err) {
        styles = state;
      }

      return Object.assign({}, action.theme, {
        styles: styles,
      });
    default:
      return state;
  }
}

function layoutReducer(state = initialState.layout, action) {
  let layout;

  switch (action.type) {
    case LAYOUT_AVAILABLE:
      try {
        layout = Object.assign({}, state, JSON.parse(action.layout));
      } catch (err) {
        layout = state;
      }

      return Object.assign({}, layout);
    default:
      return state;
  }
}

function navigationReducer(state = initialState.navigation, action) {
  switch (action.type) {
    case NAVIGATION_AVAILABLE:
      return action.links || state;
    default:
      return state;
  }
}

function addressReducer(state = initialState.address, action) {
  switch (action.type) {
    case SET_ADDRESS:
      return {
        backend: action.address.backend,
        frontend: action.address.frontend,
        domain: action.address.domain,
      };
    default:
      return state;
  }
}

const appReducers = combineReducers({
  auth: authReducer,
  siteinfo: siteinfoReducer,
  networkAction: networkActionReducer,
  profile: profileReducer,
  message: messageReducer,
  theme: themeReducer,
  layout: layoutReducer,
  navigation: navigationReducer,
  address: addressReducer,
});

const reducer = (state = initialState, action) => {
  if (action.type === HYDRATE) {
    const nextState = {
      ...state,
      ...action.payload,
    };

    // preserve values on client side navigation
    if (!state.auth.guest) {
      nextState.auth = state.auth;
      nextState.profile = state.profile;
    }

    return nextState;
  } else {
    return appReducers(state, action);
  }
};

export default reducer;
