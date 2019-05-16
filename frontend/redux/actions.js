/**
 * Action creators
 */
import {
  SIGN_IN,
  SIGN_OUT,
  NETWORK_ACTION,
  PROFILE_AVAILABLE,
  PROFILE_CLEAR,
  SITEINFO_AVAILABLE
} from './actionTypes.js'
import { BACKEND } from '../config/constants.js'
import { queryGraphQL } from '../lib/utils.js'

export function signedIn (userid, token) {
  return async (dispatch, getState) => {
    dispatch({ type: SIGN_IN, token, userid })

    try {
      dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        `{ profile: getUser(email: "${userid}") {name, isCreator, id} }`,
        getState().auth.token
      )

      dispatch(networkAction(false))
      dispatch(updateProfile(response.profile))
    } catch (err) {
      // do nothing
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

export function networkAction (flag) {
  return dispatch => dispatch({ type: NETWORK_ACTION, flag })
}

export function updateProfile (profile) {
  return { type: PROFILE_AVAILABLE, profile }
}

export function clearProfile () {
  return { type: PROFILE_CLEAR }
}

export function updateSiteInfo () {
  return async (dispatch, getState) => {
    try {
      dispatch(networkAction(true))

      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        `{ site: getSiteInfo { title, subtitle, logopath } }`)

      dispatch(networkAction(false))
      dispatch({ type: SITEINFO_AVAILABLE, siteinfo: response.site })
    } catch (err) {
      // do nothing
    } finally {
      dispatch(networkAction(false))
    }
  }
}
