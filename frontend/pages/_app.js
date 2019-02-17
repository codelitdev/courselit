import React from 'react'
import { Provider } from 'react-redux'
import App, { Container } from 'next/app'
import makeStore from '../redux/store.js'
import withRedux from 'next-redux-wrapper'
import { getCookie } from '../lib/session.js'
import { JWT_COOKIE_NAME } from '../config/constants.js'
import { signedIn } from '../redux/actions.js'

/**
 * A custom class for hooking in Redux store.
 */

class MyApp extends App {
  static async getInitialProps ({ Component, ctx }) {
    // ctx.store.dispatch({ type: 'ANY' })

    const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {}

    return { pageProps }
  }

  render () {
    const { Component, pageProps, store } = this.props

    const token_cookie = getCookie(JWT_COOKIE_NAME)
    if (token_cookie)
      store.dispatch(signedIn(token_cookie))

    return (
      <Container>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
      </Container>
    )
  }
}

export default withRedux(makeStore)(MyApp)
