/**
 * Provides cookie based session management functions.
 *
 * Note: This limits the app to client-side only.
 */

import Cookies from 'js-cookie'

export const setCookie = (key, value) => {
  if (process.browser) { Cookies.set(key, value, { expires: 1, path: '/' }) }
}

export const getCookie = (key) => {
  return process.browser ? Cookies.get(key) : null
}

export const removeCookie = (key) => {
  if (process.browser) { Cookies.remove(key) }
}
