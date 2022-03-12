import React, { useEffect } from 'react';
import type { AppProps } from 'next/app'
import { CacheProvider, EmotionCache } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import createEmotionCache from '../ui-lib/create-emotion-cache';
import { Provider, useStore } from "react-redux";
import wrapper from "../state/store";
import { StyledEngineProvider } from '@mui/material/styles';
import { CONSOLE_MESSAGE_THEME_INVALID } from '../ui-config/strings';
import { createTheme, responsiveFontSizes } from "@mui/material/styles"
import defaultTheme from '../ui-config/defaultTheme';
import { deepmerge } from "@mui/utils";

type CourseLitProps = AppProps & {
  emotionCache: EmotionCache 
}

const clientSideEmotionCache = createEmotionCache();

function MyApp({ Component, pageProps, emotionCache = clientSideEmotionCache }: CourseLitProps) {
  const store = useStore();
  const { theme } = store.getState();

  let muiTheme;
  if (theme.styles) {
    muiTheme = responsiveFontSizes(createTheme(deepmerge(defaultTheme, theme.styles)));
  } else {
    console.warn(CONSOLE_MESSAGE_THEME_INVALID);
    muiTheme = responsiveFontSizes(createTheme(defaultTheme));
  }

  useEffect(() => {
    removeServerSideInjectedCSS();
  }, []);

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
  )
}

export default wrapper.withRedux(MyApp);
