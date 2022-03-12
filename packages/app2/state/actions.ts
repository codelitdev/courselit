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
} from "./action-types";
// import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import FetchBuilder from "../ui-lib/fetch";
import defaultState from "./default-state";
import { getAddress } from "../ui-lib/utils";
import State from "../ui-models/state";

export function signedIn(userid: string, token: string) {
  return async (dispatch: any) => {
    dispatch({ type: SIGN_IN, token, userid });
    dispatch(refreshUserProfile(userid));
  };
}

export function refreshUserProfile(userId: string) {
  return async (dispatch: any, getState: () => State) => {
    try {
      dispatch(networkAction(true));
      const userID = userId || getState().profile.email;

      const query = `
      { profile: getUser(email: "${userID}") {
          name,
          id,
          email,
          purchases,
          userId,
          bio,
          permissions
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

export function signedOut(domain: string) {
  return (dispatch: any) => {
    // removeCookie({ key: JWT_COOKIE_NAME, domain });
    // removeCookie({ key: USERID_COOKIE_NAME, domain });
    dispatch(clearProfile());
    dispatch({ type: SIGN_OUT });
  };
}

export function authHasBeenChecked() {
  return (dispatch: any) => {
    dispatch({ type: AUTH_CHECKED });
  };
}

export function networkAction(flag: boolean) {
  return (dispatch: any) => dispatch({ type: NETWORK_ACTION, flag });
}

export function updateProfile(profile: any) {
  return { type: PROFILE_AVAILABLE, profile };
}

export function clearProfile() {
  return { type: PROFILE_CLEAR };
}

export function updateSiteInfo() {
  return async (dispatch: any, getState: () => State) => {
    try {
      dispatch(networkAction(true));

      const query = `
      { site: getSiteInfo {
          title,
          subtitle,
          logopath {
            file
          },
          currencyUnit,
          currencyISOCode,
          paymentMethod,
          stripePublishableKey,
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

export function newSiteInfoAvailable(info: typeof defaultState.siteinfo) {
  return { type: SITEINFO_AVAILABLE, siteinfo: info };
}

export function setAppMessage(message: string) {
  return (dispatch: any) => dispatch({ type: SET_MESSAGE, message });
}

export function clearAppMessage() {
  return (dispatch: any) => dispatch({ type: CLEAR_MESSAGE });
}

export function updateSiteTheme() {
  return async (dispatch: any, getState: () => State) => {
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

export function themeAvailable(theme: typeof defaultState.theme) {
  return { type: THEME_AVAILABLE, theme };
}

export function updateSiteLayout() {
  return async (dispatch: any, getState: () => State) => {
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

export function layoutAvailable(layout: typeof defaultState.layout) {
  return { type: LAYOUT_AVAILABLE, layout };
}

export function updateSiteNavigation() {
  return async (dispatch: any, getState: () => State) => {
    try {
      dispatch(networkAction(true));

      const query = `
      query {
        siteNavigation: getMenu {
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

export function navigationAvailable(links: typeof defaultState.navigation) {
  return { type: NAVIGATION_AVAILABLE, links };
}

export function updateBackend(host: string) {
  return { type: SET_ADDRESS, address: getAddress(host) };
}
