/**
 * The reducer function
 */

import { combineReducers } from 'redux'
import {
  SIGN_IN,
  SIGN_OUT
} from './actionTypes.js'

// The initial state of the app
const initialState = {
  auth: { guest: true, token: '' }
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

export default combineReducers({
  auth: authReducer
})
