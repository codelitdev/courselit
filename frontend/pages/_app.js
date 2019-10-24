import { Provider } from 'react-redux'
import App from 'next/app'
import makeStore from '../redux/store.js'
import withRedux from 'next-redux-wrapper'
import { getCookie } from '../lib/session.js'
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from '../config/constants.js'
import { signedIn, updateSiteInfo, authHasBeenChecked } from '../redux/actions.js'
import { ThemeProvider } from '@material-ui/styles'
import theme from '../theme'

class MyApp extends App {
  static async getInitialProps (props) {
    const { Component, ctx } = props
    await ctx.store.dispatch(updateSiteInfo())
    const pageProps = Component.getInitialProps ? await Component.getInitialProps(ctx) : {}
    return { pageProps }
  }

  componentDidMount () {
    this.setUpCookies()
    this.removeServerSideInjectedCSS()
  }

  setUpCookies () {
    const { store } = this.props
    const tokenCookie = getCookie(JWT_COOKIE_NAME)
    if (tokenCookie) {
      store.dispatch(
        signedIn(
          getCookie(USERID_COOKIE_NAME), getCookie(JWT_COOKIE_NAME)
        )
      )
    }
    store.dispatch(authHasBeenChecked())
  }

  removeServerSideInjectedCSS () {
    const jssStyles = document.querySelector('#jss-server-side')
    if (jssStyles) {
      jssStyles.parentNode.removeChild(jssStyles)
    }
  }

  render () {
    const { Component, pageProps, store } = this.props

    return (
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <Component {...pageProps} />
        </ThemeProvider>
      </Provider>
    )
  }
}

export default withRedux(makeStore)(MyApp)
