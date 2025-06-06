import React from "react";
import "../styles/globals.css";
import "@courselit/page-blocks/styles.css";
import "@courselit/components-library/styles.css";
import "@courselit/page-primitives/styles.css";
import type { AppProps } from "next/app";
import { Provider, useStore } from "react-redux";
import { store as wrapper } from "@courselit/state-management";
import App from "next/app";
import type { State } from "@courselit/common-models";
import { AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { actionCreators } from "@courselit/state-management";
import CodeInjector from "../components/public/code-injector";
import { useRouter } from "next/router";
import "remirror/styles/all.css";
import { getBackendAddress } from "../ui-lib/utils";
import { SessionProvider } from "next-auth/react";
import * as fonts from "@/lib/fonts";
import { ThemeProvider } from "../components/next-theme-provider";

type CourseLitProps = AppProps & {};

function MyApp({
    Component,
    pageProps: { session, ...pageProps },
}: CourseLitProps) {
    //const [mounted, setMounted] = useState(false);
    const store = useStore();
    const router = useRouter();

    /*
    useEffect(() => {
        setMounted(true);
    }, []);
    */

    return (
        <SessionProvider session={session}>
            <Provider store={store}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div
                        className={`${fonts.openSans.variable} ${fonts.montserrat.variable} ${fonts.lato.variable} ${fonts.poppins.variable} ${fonts.sourceSans3.variable} ${fonts.raleway.variable} ${fonts.notoSans.variable} ${fonts.merriweather.variable} ${fonts.inter.variable} ${fonts.alegreya.variable} ${fonts.roboto.variable} ${fonts.mulish.variable} ${fonts.nunito.variable} ${fonts.rubik.variable} ${fonts.playfairDisplay.variable} ${fonts.oswald.variable} ${fonts.ptSans.variable} ${fonts.workSans.variable} ${fonts.robotoSlab.variable} ${fonts.sourceSerif4.variable} ${fonts.bebasNeue.variable} ${fonts.quicksand.variable} font-sans`}
                    >
                        <Component {...pageProps} />
                    </div>
                    <CodeInjector router={router} />
                </ThemeProvider>
            </Provider>
        </SessionProvider>
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
                    actionCreators.updateConfig(),
                );
                await (store.dispatch as ThunkDispatch<State, void, AnyAction>)(
                    actionCreators.updateSiteInfo(),
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
    },
);

export default wrapper.withRedux(MyApp);
