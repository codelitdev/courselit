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
  SET_ERROR,
  CLEAR_ERROR
} from './actionTypes.js'
import { BACKEND } from '../config/constants.js'
import FetchBuilder from '../lib/fetch.js'

export function signedIn (userid, token) {
  return async (dispatch, getState) => {
    dispatch({ type: SIGN_IN, token, userid })
    dispatch(refreshUserProfile(userid))
  }
}

export function refreshUserProfile (userId) {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true))
      const userID = userId || getState().profile.email

      const query = `
      { profile: getUser(email: "${userID}") {
          name,
          isCreator,
          id,
          isAdmin,
          email,
          purchases
        }
      }
      `
      const fetch = new FetchBuilder()
        .setUrl(`${BACKEND}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .setAuthToken(getState().auth.token)
        .build()
      const response = await fetch.exec()

      dispatch(networkAction(false))
      dispatch(updateProfile(response.profile))
    } finally {
      dispatch(networkAction(false))
    }
  }
}

export function signedOut () {
  return dispatch => {
    dispatch(clearProfile())
    dispatch({ type: SIGN_OUT })
  }
}

export function authHasBeenChecked () {
  return dispatch => {
    dispatch({ type: AUTH_CHECKED })
  }
}

export function networkAction (flag) {
  return dispatch => dispatch({ type: NETWORK_ACTION, flag })
}

export function updateProfile (profile) {
  return { type: PROFILE_AVAILABLE, profile }
}

export function clearProfile () {
  return { type: PROFILE_CLEAR }
}

export function newSiteInfoAvailable (info) {
  return { type: SITEINFO_AVAILABLE, siteinfo: info }
}

export function updateSiteInfo () {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true))

      const query = `
      { site: getSiteInfo {
          title,
          subtitle,
          logopath,
          currencyUnit,
          currencyISOCode,
          copyrightText,
          about,
          paymentMethod,
          stripePublishableKey
        }
      }
      `
      const fetch = new FetchBuilder()
        .setUrl(`${BACKEND}/graph`)
        .setPayload(query)
        .setIsGraphQLEndpoint(true)
        .build()
      const response = await fetch.exec()

      dispatch(networkAction(false))
      dispatch(newSiteInfoAvailable(response.site))
    } finally {
      dispatch(networkAction(false))
    }
  }
}

export function setAppError (error) {
  return dispatch => dispatch({ type: SET_ERROR, error })
}

export function clearAppError () {
  return dispatch => dispatch({ type: CLEAR_ERROR })
}
