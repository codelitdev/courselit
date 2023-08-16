import React, { useEffect, useState } from "react";
import "../styles/globals.css";
import "@courselit/common-widgets/styles.css";
import "@courselit/components-library/styles.css";
import type { AppProps } from "next/app";
import { CacheProvider, EmotionCache } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import createEmotionCache from "../ui-lib/create-emotion-cache";
import { Provider, useStore } from "react-redux";
import { store as wrapper } from "@courselit/state-management";
import {
    createTheme,
    responsiveFontSizes,
    ThemeProvider,
} from "@mui/material/styles";
import App from "next/app";
import type { State } from "@courselit/common-models";
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import CodeInjector from "../components/public/code-injector";
import { useRouter } from "next/router";
import "remirror/styles/all.css";
import themeOptions from "../ui-config/mui-custom-theme";
import { getBackendAddress } from "../ui-lib/utils";
import FontsInjector from "../components/public/fonts-injector";

type CourseLitProps = AppProps & {
    emotionCache: EmotionCache;
};

const clientSideEmotionCache = createEmotionCache();

function MyApp({
    Component,
    pageProps,
    emotionCache = clientSideEmotionCache,
}: CourseLitProps) {
    const [mounted, setMounted] = useState(false);
    const store = useStore();
    const router = useRouter();

    const muiTheme = responsiveFontSizes(createTheme(themeOptions()));

    useEffect(() => {
        setMounted(true);
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

    return (
        <Provider store={store}>
            <CacheProvider value={emotionCache}>
                <ThemeProvider theme={muiTheme}>
                    <CssBaseline />
                    <div
                        style={{
                            visibility: !mounted ? "hidden" : "visible",
                        }}
                    >
                        <Component {...pageProps} />
                    </div>
                    <CodeInjector router={router} />
                    <FontsInjector router={router} />
                </ThemeProvider>
            </CacheProvider>
        </Provider>
    );
}

MyApp.getInitialProps = wrapper.getInitialAppProps(
    (store) => async (context) => {
        const { ctx } = context;
        if (ctx.req && ctx.req.headers && ctx.req.headers.host) {
            const backend = getBackendAddress(ctx.req.headers);
            store.dispatch(actionCreators.updateBackend(backend));
            try {
                await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
                    actionCreators.updateSiteInfo()
                );
            } catch (error: any) {
                console.error(error);
                return;
            }
        }

        return {
            pageProps: {
                ...(await App.getInitialProps(context)).pageProps,
            },
        };
    }
);

export default wrapper.withRedux(MyApp);
