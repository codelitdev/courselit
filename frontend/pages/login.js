import { useState } from 'react'
import { connect } from 'react-redux'
import Router from 'next/router'
import fetch from 'isomorphic-unfetch'
import {
  ERR_ALL_FIELDS_REQUIRED,
  ERR_PASSWORDS_DONT_MATCH,
  ERR_IN_USER_CREATION,
  RESP_API_ERROR,
  RESP_API_USER_CREATED,
  SIGNUP_SUCCESS,
  ERR_LOGIN_FAILED
} from '../config/strings.js'
import {
  BACKEND,
  JWT_COOKIE_NAME,
  USERID_COOKIE_NAME
} from '../config/constants.js'
import {
  signedIn,
  networkAction
} from '../redux/actions.js'
import { setCookie } from '../lib/session.js'
// import { redirector } from '../lib/utils.js'
import ProtectedRoute from '../components/ProtectedRoute.js'
import MasterLayout from './masterlayout.js'

function Login (props) {
  // redirector(props.auth, Router, '/')

  const emptyStringPat = /^\s*$/
  const defaultSignupData = { email: '', pass: '', conf: '', err: '', msg: '' }
  const defaultLoginData = { email: '', pass: '', err: '' }
  const [loginData, setLoginData] = useState(defaultLoginData)
  const [signupData, setSignupData] = useState(defaultSignupData)

  async function handleLogin (event) {
    event.preventDefault()

    // validating the data
    if (!loginData.email ||
      emptyStringPat.test(loginData.pass)) {
      return setLoginData(
        Object.assign(
          {},
          loginData,
          { err: ERR_ALL_FIELDS_REQUIRED }
        )
      )
    }

    // clear error message set by previous submissions, if there is any
    setLoginData(Object.assign({}, loginData, { err: '', msg: '' }))

    try {
      props.dispatch(networkAction(true))

      const res = await fetch(`${BACKEND}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `email=${loginData.email}&password=${loginData.password}`
      })

      if (res.status === 200) {
        const data = await res.json()

        if (typeof data.token !== 'undefined') {
          // set cookie
          setCookie(JWT_COOKIE_NAME, data.token)
          setCookie(USERID_COOKIE_NAME, loginData.email)

          // save the token in redux store
          props.dispatch(signedIn(loginData.email, data.token))
        }
      } else {
        console.log('came here')
        return setLoginData(
          Object.assign(
            {},
            loginData,
            { err: ERR_LOGIN_FAILED }
          )
        )
      }
    } catch (err) {
      // do nothing
      return setLoginData(
        Object.assign(
          {},
          loginData,
          { err: err.message }
        )
      )
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  async function handleSignup (event) {
    event.preventDefault()

    // validate the data
    if (!signupData.email ||
      emptyStringPat.test(signupData.pass) ||
      emptyStringPat.test(signupData.conf)) {
      return setSignupData(
        Object.assign(
          {},
          signupData,
          { err: ERR_ALL_FIELDS_REQUIRED, msg: '' }
        )
      )
    }

    if (signupData.pass !== signupData.conf) {
      return setSignupData(
        Object.assign(
          {},
          signupData,
          { err: ERR_PASSWORDS_DONT_MATCH, msg: '' }
        )
      )
    }

    // clear error message set by previous submissions, if there is any
    setSignupData(Object.assign({}, signupData, { err: '', msg: '' }))

    try {
      props.dispatch(networkAction(true))

      const res = await fetch(`${BACKEND}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `email=${signupData.email}&password=${signupData.password}`
      })
      const data = await res.json()

      if (data.message === RESP_API_ERROR) {
        return setSignupData(
          Object.assign(
            {},
            signupData,
            { err: ERR_IN_USER_CREATION, msg: '' }
          )
        )
      }

      if (data.message === RESP_API_USER_CREATED) {
        setSignupData(
          Object.assign(
            {},
            defaultSignupData,
            { err: '', msg: SIGNUP_SUCCESS }
          )
        )
      }
    } catch (err) {
      return setSignupData(
        Object.assign(
          {},
          signupData,
          { err: err.message, msg: '' }
        )
      )
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  return (
    <MasterLayout>
      <ProtectedRoute
        condition={!props.auth.guest}
        router={Router}
        redirectTo='/'
        renderOnServer={true}>
        <div>
          <div>
            <h2>Log in</h2>
            <form onSubmit={handleLogin}>
              {loginData.err &&
                <div>{loginData.err}</div>
              }
              <label> Email:
                <input
                  type='email'
                  value={loginData.email}
                  onChange={
                    (e) => setLoginData(
                      Object.assign({}, loginData, {
                        email: e.target.value
                      })
                    )}/>
              </label>
              <label> Password:
                <input
                  type='password'
                  value={loginData.pass}
                  onChange={
                    (e) => setLoginData(
                      Object.assign({}, loginData, {
                        pass: e.target.value
                      })
                    )}/>
              </label>
              <input type='submit' value='Submit' />
            </form>
          </div>
          <div>
            <h2>Sign up</h2>
            <form onSubmit={handleSignup}>
              {signupData.msg &&
                <div>{signupData.msg}</div>
              }
              {signupData.err &&
                <div>{signupData.err}</div>
              }
              <label> Email:
                <input
                  type='email'
                  value={signupData.email}
                  onChange={
                    (e) => setSignupData(
                      Object.assign({}, signupData, {
                        email: e.target.value
                      })
                    )}/>
              </label>
              <label> Password:
                <input
                  type='password'
                  value={signupData.pass}
                  onChange={
                    (e) => setSignupData(
                      Object.assign({}, signupData, {
                        pass: e.target.value
                      })
                    )}/>
              </label>
              <label> Confirm password:
                <input
                  type='password'
                  value={signupData.conf}
                  onChange={
                    (e) => setSignupData(
                      Object.assign({}, signupData, {
                        conf: e.target.value
                      })
                    )}/>
              </label>
              <input type='submit' value='Submit' />
            </form>
          </div>
        </div>
      </ProtectedRoute>
    </MasterLayout>
  )
}

// Login.getInitialState = async ({ store, isServer, pathname, query }) => {
//   return { store }
// }

export default connect(state => state)(Login)
