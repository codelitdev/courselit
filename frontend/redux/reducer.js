import { combineReducers } from 'redux'
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
import {
  GENERIC_TITLE,
  GENERIC_SUBTITLE,
  GENERIC_LOGO_PATH,
  GENERIC_CURRENCY_UNIT,
  GENERIC_COPYRIGHT_TEXT,
  GENERIC_ABOUT_TEXT
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
    logo: GENERIC_LOGO_PATH,
    currencyUnit: GENERIC_CURRENCY_UNIT,
    copyrightText: GENERIC_COPYRIGHT_TEXT,
    about: GENERIC_ABOUT_TEXT
  },
  networkAction: false,
  profile: {
    isCreator: false,
    name: null,
    id: null,
    fetched: false,
    isAdmin: false
  },
  error: {
    open: false,
    message: '',
    action: null
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
          logopath: action.siteinfo.logopath,
          currencyUnit: action.siteinfo.currencyUnit,
          currencyISOCode: action.siteinfo.currencyISOCode,
          copyrightText: action.siteinfo.copyrightText,
          about: action.siteinfo.about
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

function appErrorReducer (state = initialState.error, action) {
  switch (action.type) {
    case SET_ERROR:
      return {
        message: action.error.message,
        action: action.error.action,
        open: true
      }
    case CLEAR_ERROR:
      return initialState.error
    default:
      return state
  }
}

export default combineReducers({
  auth: authReducer,
  siteinfo: siteinfoReducer,
  networkAction: networkActionReducer,
  profile: profileReducer,
  error: appErrorReducer
})
