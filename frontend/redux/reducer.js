/**
 * The reducer function
 */

import { combineReducers } from 'redux'
import {
  SIGN_IN,
  SIGN_OUT
} from './actionTypes.js'
import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH
} from '../config/strings.js'

// The initial state of the app
const initialState = {
  auth: { guest: true, token: '' },
  brand: {
    title: GENERIC_TITLE,
    subtitle: GENERIC_SUBTITLE,
    logo: GENERIC_LOGO_PATH
  }
}

function authReducer (state = initialState.auth, action) {
  switch (action.type) {
    case SIGN_IN:
      return { guest: false, token: action.token }
    case SIGN_OUT:
      return initialState.auth
    default:
      return state
  }
}

function brandReducer (state = initialState.brand, action) {
  switch (action.type) {
    default:
      return state
  }
}

export default combineReducers({
  auth: authReducer,
  brand: brandReducer
})
