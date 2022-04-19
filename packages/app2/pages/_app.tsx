import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import createEmotionCache from "../ui-lib/create-emotion-cache";
import { Provider, useStore } from "react-redux";
import { store as wrapper } from "@courselit/state-management";
import { StyledEngineProvider } from "@mui/material/styles";
import { CONSOLE_MESSAGE_THEME_INVALID } from "../ui-config/strings";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import defaultTheme from "../ui-config/default-theme";
import { deepmerge } from "@mui/utils";
import App from "next/app";
import type { State } from "@courselit/common-models";
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import CodeInjector from "../components/Public/CodeInjector";

type CourseLitProps = AppProps & {
  emotionCache: EmotionCache;
};

const clientSideEmotionCache = createEmotionCache();

function MyApp({
  Component,
  pageProps,
  emotionCache = clientSideEmotionCache,
}: CourseLitProps) {
  const store = useStore();
  const { theme } = store.getState();

  let muiTheme;
  if (theme.styles) {
    muiTheme = responsiveFontSizes(
      createTheme(deepmerge(defaultTheme, theme.styles))
    );
  } else {
    console.warn(CONSOLE_MESSAGE_THEME_INVALID);
    muiTheme = responsiveFontSizes(createTheme(defaultTheme));
  }

  useEffect(() => {
    removeServerSideInjectedCSS();
    checkForSession();
  }, []);

  const checkForSession = async () => {
    const response = await fetch("/api/auth/user", {
      method: "POST",
      credentials: "same-origin",
    });
    if (response.status === 200) {
      (store.dispatch as ThunkDispatch<State, null, AnyAction>)(
        actionCreators.signedIn()
      );
    }
    (store.dispatch as ThunkDispatch<State, null, AnyAction>)(
      actionCreators.authChecked()
    );
  };

  const removeServerSideInjectedCSS = () => {
    const jssStyles = document.querySelector("#jss-server-side");
    if (jssStyles) {
      jssStyles.parentNode!.removeChild(jssStyles);
    }
  };

  return (
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <CacheProvider value={emotionCache}>
          <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <Component {...pageProps} />
            <CodeInjector />
          </ThemeProvider>
        </CacheProvider>
      </StyledEngineProvider>
    </Provider>
  );
}

MyApp.getInitialProps = wrapper.getInitialAppProps(
  (store) => async (context) => {
    const { ctx } = context;
    if (ctx.req && ctx.req.headers && ctx.req.headers.host) {
      const protocol = ctx.req.headers["x-forwarded-proto"] || "http";
      store.dispatch(
        actionCreators.updateBackend(`${protocol}://${ctx.req.headers.host}`)
      );
      await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
        actionCreators.updateSiteInfo()
      );
      await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
        actionCreators.updateSiteLayout()
      );
      await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
        actionCreators.updateSiteTheme()
      );
      await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
        actionCreators.updateSiteNavigation()
      );
    }

    return {
      pageProps: {
        ...(await App.getInitialProps(context)).pageProps,
      },
    };
  }
);

export default wrapper.withRedux(MyApp);
