import { combineReducers } from 'redux'
import {
  SIGN_IN,
  SIGN_OUT,
  NETWORK_ACTION,
  PROFILE_AVAILABLE,
  PROFILE_CLEAR,
  SITEINFO_AVAILABLE,
  AUTH_CHECKED
} from './actionTypes.js'
import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH
} from '../config/strings.js'

const initialState = {
  auth: {
    guest: true,
    token: null,
    userid: null,
    checked: false
  },
  siteinfo: {
    title: GENERIC_TITLE,
    subtitle: GENERIC_SUBTITLE,
    logo: GENERIC_LOGO_PATH
  },
  networkAction: false,
  profile: {
    isCreator: false,
    name: null,
    id: null,
    fetched: false,
    isAdmin: false
  }
}

function authReducer (state = initialState.auth, action) {
  switch (action.type) {
    case SIGN_IN:
      return { guest: false, token: action.token, userid: action.userid, checked: true }
    case SIGN_OUT:
      return initialState.auth
    case AUTH_CHECKED:
      return Object.assign({}, state, { checked: true })
    default:
      return state
  }
}

function siteinfoReducer (state = initialState.siteinfo, action) {
  switch (action.type) {
    case SITEINFO_AVAILABLE:
      try {
        return {
          title: action.siteinfo.title,
          subtitle: action.siteinfo.subtitle,
          logopath: action.siteinfo.logopath
        }
      } catch (e) {
        return state
      }
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
        fetched: true,
        isAdmin: action.profile.isAdmin || false
      }
    case PROFILE_CLEAR:
      return initialState.profile
    default:
      return state
  }
}

export default combineReducers({
  auth: authReducer,
  siteinfo: siteinfoReducer,
  networkAction: networkActionReducer,
  profile: profileReducer
})
