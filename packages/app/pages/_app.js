import { Provider } from "react-redux";
import App from "next/app";
import makeStore from "../redux/store.js";
import withRedux from "next-redux-wrapper";
import { getCookie } from "../lib/session.js";
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import {
  signedIn,
  updateSiteInfo,
  authHasBeenChecked,
  updateSiteTheme,
  updateSiteLayout
} from "../redux/actions.js";
import { ThemeProvider } from "@material-ui/styles";
import CodeInjector from "../components/CodeInjector.js";
import { responsiveFontSizes, createMuiTheme } from "@material-ui/core";

class MyApp extends App {
  static async getInitialProps(props) {
    const { Component, ctx } = props;
    await this.fetchSiteSettings(ctx);

    const pageProps = Component.getInitialProps
      ? await Component.getInitialProps(ctx)
      : {};
    return { pageProps };
  }

  static async fetchSiteSettings(ctx) {
    await ctx.store.dispatch(updateSiteInfo());
    await ctx.store.dispatch(updateSiteLayout());
    await ctx.store.dispatch(updateSiteTheme());
  }

  componentDidMount() {
    this.setUpCookies();
    this.removeServerSideInjectedCSS();
  }

  setUpCookies() {
    const { store } = this.props;
    const tokenCookie = getCookie(JWT_COOKIE_NAME);
    if (tokenCookie) {
      store.dispatch(
        signedIn(getCookie(USERID_COOKIE_NAME), getCookie(JWT_COOKIE_NAME))
      );
    }
    store.dispatch(authHasBeenChecked());
  }

  removeServerSideInjectedCSS() {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  }

  render() {
    const { Component, pageProps, store } = this.props;
    const { theme } = store.getState();
    const muiTheme = responsiveFontSizes(
      createMuiTheme(Object.keys(theme.styles).length ? theme.styles : {})
    );

    return (
      <Provider store={store}>
        <ThemeProvider theme={muiTheme}>
          <Component {...pageProps} />
          <CodeInjector />
        </ThemeProvider>
      </Provider>
    );
  }
}

export default withRedux(makeStore)(MyApp);
