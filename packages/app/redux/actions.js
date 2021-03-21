/**
 * Action creators
 */
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
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import FetchBuilder from "../lib/fetch.js";
import { removeCookie } from "../lib/session.js";
import { getAddress } from "../lib/utils.js";

export function signedIn(userid, token) {
  return async (dispatch) => {
    dispatch({ type: SIGN_IN, token, userid });
    dispatch(refreshUserProfile(userid));
  };
}

export function refreshUserProfile(userId) {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true));
      const userID = userId || getState().profile.email;

      const query = `
      { profile: getUser(email: "${userID}") {
          name,
          isCreator,
          id,
          isAdmin,
          email,
          purchases,
          userId,
          bio
        }
      }
      `;
      const fetch = new FetchBuilder()
        .setUrl(`${getState().address.backend}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .setAuthToken(getState().auth.token)
        .build();
      const response = await fetch.exec();
      dispatch(networkAction(false));
      dispatch(updateProfile(response.profile));
    } finally {
      dispatch(networkAction(false));
    }
  };
}

export function signedOut(domain) {
  return (dispatch) => {
    removeCookie({ key: JWT_COOKIE_NAME, domain });
    removeCookie({ key: USERID_COOKIE_NAME, domain });
    dispatch(clearProfile());
    dispatch({ type: SIGN_OUT });
  };
}

export function authHasBeenChecked() {
  return (dispatch) => {
    dispatch({ type: AUTH_CHECKED });
  };
}

export function networkAction(flag) {
  return (dispatch) => dispatch({ type: NETWORK_ACTION, flag });
}

export function updateProfile(profile) {
  return { type: PROFILE_AVAILABLE, profile };
}

export function clearProfile() {
  return { type: PROFILE_CLEAR };
}

export function updateSiteInfo() {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true));

      const query = `
      { site: getSiteInfo {
          title,
          subtitle,
          logopath,
          currencyUnit,
          currencyISOCode,
          paymentMethod,
          stripePublishableKey,
          themePrimaryColor,
          themeSecondaryColor,
          codeInjectionHead
        }
      }
      `;
      const fetch = new FetchBuilder()
        .setUrl(`${getState().address.backend}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();

      dispatch(networkAction(false));
      dispatch(newSiteInfoAvailable(response.site));
    } finally {
      dispatch(networkAction(false));
    }
  };
}

export function newSiteInfoAvailable(info) {
  return { type: SITEINFO_AVAILABLE, siteinfo: info };
}

export function setAppMessage(message) {
  return (dispatch) => dispatch({ type: SET_MESSAGE, message });
}

export function clearAppMessage() {
  return (dispatch) => dispatch({ type: CLEAR_MESSAGE });
}

export function updateSiteTheme() {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true));

      const query = `
      { 
        theme: getTheme {
          styles
        }
      }
      `;
      const fetch = new FetchBuilder()
        .setUrl(`${getState().address.backend}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();

      dispatch(networkAction(false));
      dispatch(themeAvailable(response.theme));
    } finally {
      dispatch(networkAction(false));
    }
  };
}

export function themeAvailable(theme) {
  return { type: THEME_AVAILABLE, theme };
}

export function updateSiteLayout() {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true));

      const query = `
      {
        layout: getLayout {
          layout
        }
      }
      `;

      const fetch = new FetchBuilder()
        .setUrl(`${getState().address.backend}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();

      dispatch(networkAction(false));
      dispatch(layoutAvailable(response.layout && response.layout.layout));
    } finally {
      dispatch(networkAction(false));
    }
  };
}

export function layoutAvailable(layout) {
  return { type: LAYOUT_AVAILABLE, layout };
}

export function updateSiteNavigation() {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true));

      const query = `
      query {
        siteNavigation: getPublicNavigation {
          text,
          destination,
          category,
          newTab,
        }
      }
      `;
      const fetch = new FetchBuilder()
        .setUrl(`${getState().address.backend}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build();
      const response = await fetch.exec();

      dispatch(networkAction(false));
      dispatch(navigationAvailable(response.siteNavigation));
    } finally {
      dispatch(networkAction(false));
    }
  };
}

export function navigationAvailable(links) {
  return { type: NAVIGATION_AVAILABLE, links };
}

export function updateBackend(host) {
  return { type: SET_ADDRESS, address: getAddress(host) };
}
