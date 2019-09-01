import React from 'react'
import { Provider } from 'react-redux'
import App, { Container } from 'next/app'
import makeStore from '../redux/store.js'
import withRedux from 'next-redux-wrapper'
import { getCookie } from '../lib/session.js'
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from '../config/constants.js'
import { signedIn, updateSiteInfo } from '../redux/actions.js'

class MyApp extends App {
  static async getInitialProps (props) {
    const { Component, ctx } = props
    await ctx.store.dispatch(updateSiteInfo())
    const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {}
    return { pageProps }
  }

  componentDidMount () {
    const { store } = this.props
    const tokenCookie = getCookie(JWT_COOKIE_NAME)
    if (tokenCookie) {
      store.dispatch(
        signedIn(
          getCookie(USERID_COOKIE_NAME), getCookie(JWT_COOKIE_NAME)
        )
      )
    }
  }

  render () {
    const { Component, pageProps, store } = this.props

    return (
      <Container>
        <Provider store={store}>
          <Component {...pageProps} />
        </Provider>
        <style jsx global>{`
          /* http://meyerweb.com/eric/tools/css/reset/ 
              v2.0 | 20110126
              License: none (public domain)
          */
          
          html, body, div, span, applet, object, iframe,
          h1, h2, h3, h4, h5, h6, p, blockquote, pre,
          a, abbr, acronym, address, big, cite, code,
          del, dfn, em, img, ins, kbd, q, s, samp,
          small, strike, strong, sub, sup, tt, var,
          b, u, i, center,
          dl, dt, dd, ol, ul, li,
          fieldset, form, label, legend,
          table, caption, tbody, tfoot, thead, tr, th, td,
          article, aside, canvas, details, embed, 
          figure, figcaption, footer, header, hgroup, 
          menu, nav, output, ruby, section, summary,
          time, mark, audio, video {
            margin: 0;
            padding: 0;
            border: 0;
            font-size: 100%;
            font: inherit;
            vertical-align: baseline;
          }
          /* HTML5 display-role reset for older browsers */
          article, aside, details, figcaption, figure, 
          footer, header, hgroup, menu, nav, section {
            display: block;
          }
          body {
            line-height: 1;
          }
          ol, ul {
            list-style: none;
          }
          blockquote, q {
            quotes: none;
          }
          blockquote:before, blockquote:after,
          q:before, q:after {
            content: '';
            content: none;
          }
          table {
            border-collapse: collapse;
            border-spacing: 0;
          }
        `}</style>
      </Container>
    )
  }
}

export default withRedux(makeStore)(MyApp)
