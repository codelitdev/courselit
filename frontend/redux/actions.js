/**
 * Action creators
 */
import {
  SIGN_IN,
  SIGN_OUT
} from './actionTypes.js'

export function signedIn (token) {
  return { type: SIGN_IN, token }
}

export function signedOut () {
  return { type: SIGN_OUT }
}
