import { connect } from 'react-redux'
import Router from 'next/router'
import {
  signedOut
} from '../redux/actions'
import { removeCookie } from '../lib/session.js'
import {
  JWT_COOKIE_NAME
} from '../config/constants.js'

const Logout = (props) => (
  <div></div>
)

Logout.getInitialProps = async ({ store, isServer, pathname, query }) => {
  // remove token cookie
  removeCookie(JWT_COOKIE_NAME)

  store.dispatch(signedOut())
  Router.push('/')
  return {}
}

export default connect(state => state)(Logout)
