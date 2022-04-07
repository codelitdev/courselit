import React, { useEffect } from "react";
import type { AppProps } from "next/app";
import { CacheProvider, EmotionCache } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import createEmotionCache from "../ui-lib/create-emotion-cache";
import { Provider, useStore } from "react-redux";
import wrapper from "../state/store";
import { StyledEngineProvider } from "@mui/material/styles";
import { CONSOLE_MESSAGE_THEME_INVALID } from "../ui-config/strings";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import defaultTheme from "../ui-config/default-theme";
import { deepmerge } from "@mui/utils";
import App from "next/app";
import State from "../ui-models/state";
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import {
  authChecked,
  signedIn,
  updateBackend,
  updateSiteInfo,
  updateSiteLayout,
  updateSiteNavigation,
  updateSiteTheme,
} from "../state/actions";

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
      (store.dispatch as ThunkDispatch<State, null, AnyAction>)(signedIn());
    }
    (store.dispatch as ThunkDispatch<State, null, AnyAction>)(authChecked());
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
      store.dispatch(updateBackend(`${protocol}://${ctx.req.headers.host}`));
      await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
        updateSiteInfo()
      );
      // await store.dispatch(updateSiteLayout());
      // await store.dispatch(updateSiteTheme());
      // await store.dispatch(updateSiteNavigation());
    }

    return {
      pageProps: {
        ...(await App.getInitialProps(context)).pageProps,
      },
    };
  }
);

export default wrapper.withRedux(MyApp);
