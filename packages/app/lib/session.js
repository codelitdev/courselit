/**
 * Provides cookie based session management functions.
 *
 */

import Cookies from "js-cookie";

export const setCookie = ({ key, value, domain }) => {
  if (process.browser) {
    Cookies.set(key, value, { expires: 365, domain });
  }
};

export const getCookie = ({ key, domain }) => {
  return process.browser ? Cookies.get(key, { domain }) : null;
};

export const removeCookie = ({ key, domain }) => {
  if (process.browser) {
    Cookies.remove(key, { domain });
  }
};
