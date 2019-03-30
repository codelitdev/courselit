/**
 * The reducer function
 */

import { combineReducers } from 'redux'
import {
  SIGN_IN,
  SIGN_OUT,
  NETWORK_ACTION,
  PROFILE_AVAILABLE,
  PROFILE_CLEAR
} from './actionTypes.js'
import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH
} from '../config/strings.js'

// The initial state of the app
const initialState = {
  auth: { guest: true, token: null, userid: null },
  brand: {
    title: GENERIC_TITLE,
    subtitle: GENERIC_SUBTITLE,
    logo: GENERIC_LOGO_PATH
  },
  networkAction: false,
  profile: {
    isCreator: false,
    name: null,
    id: null,
    fetched: false
  }
}

function authReducer (state = initialState.auth, action) {
  switch (action.type) {
    case SIGN_IN:
      return { guest: false, token: action.token, userid: action.userid }
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

function networkActionReducer (state = initialState.networkAction, action) {
  switch (action.type) {
    case NETWORK_ACTION:
      return action.flag
    default:
      return state
  }
}

function profileReducer (state = initialState.profile, action) {
  switch (action.type) {
    case PROFILE_AVAILABLE:
      return {
        id: action.profile.id,
        name: action.profile.name,
        isCreator: action.profile.isCreator || false,
        fetched: true
      }
    case PROFILE_CLEAR:
      return initialState.profile
    default:
      return state
  }
}

export default combineReducers({
  auth: authReducer,
  brand: brandReducer,
  networkAction: networkActionReducer,
  profile: profileReducer
})
