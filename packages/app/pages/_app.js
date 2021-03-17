import { Provider, useStore } from "react-redux";
import App from "next/app";
import { getCookie } from "../lib/session.js";
import { JWT_COOKIE_NAME, USERID_COOKIE_NAME } from "../config/constants.js";
import {
  signedIn,
  updateSiteInfo,
  authHasBeenChecked,
  updateSiteTheme,
  updateSiteLayout,
  updateSiteNavigation,
  updateBackend,
} from "../redux/actions.js";
import { ThemeProvider } from "@material-ui/styles";
import { responsiveFontSizes, createMuiTheme } from "@material-ui/core";
import { CONSOLE_MESSAGE_THEME_INVALID } from "../config/strings.js";
import { useEffect } from "react";
import CodeInjector from "../components/Public/CodeInjector.js";
import wrapper from "../redux/store.js";
import "@courselit/rich-text/dist/main.css";

const WrappedApp = ({ Component, pageProps }) => {
  const store = useStore();
  let muiTheme;
  const { theme, address } = store.getState();
  try {
    muiTheme = responsiveFontSizes(
      createMuiTheme(Object.keys(theme.styles).length ? theme.styles : {})
    );
  } catch (err) {
    console.warn(CONSOLE_MESSAGE_THEME_INVALID);
    muiTheme = responsiveFontSizes(createMuiTheme({}));
  }

  useEffect(() => {
    setUpCookies();
    removeServerSideInjectedCSS();
  }, []);

  const setUpCookies = () => {
    const tokenCookie = getCookie({
      key: JWT_COOKIE_NAME,
      domain: address.domain,
    });
    if (tokenCookie) {
      store.dispatch(
        signedIn(
          getCookie({ key: USERID_COOKIE_NAME, domain: address.domain }),
          tokenCookie
        )
      );
    }
    store.dispatch(authHasBeenChecked());
  };

  const removeServerSideInjectedCSS = () => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentNode.removeChild(jssStyles);
    }
  };

  return (
    <Provider store={store}>
      <ThemeProvider theme={muiTheme}>
        <Component {...pageProps} />
        <CodeInjector />
      </ThemeProvider>
    </Provider>
  );
};

WrappedApp.getInitialProps = async (appContext) => {
  const { ctx } = appContext;

  if (ctx.req && ctx.req.headers && ctx.req.headers.host) {
    ctx.store.dispatch(updateBackend(ctx.req.headers.host));
    await ctx.store.dispatch(updateSiteInfo());
    await ctx.store.dispatch(updateSiteLayout());
    await ctx.store.dispatch(updateSiteTheme());
    await ctx.store.dispatch(updateSiteNavigation());
  }

  const appProps = await App.getInitialProps(appContext);
  return { ...appProps };
};

export default wrapper.withRedux(WrappedApp);
