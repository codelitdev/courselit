import React from "react";
import "../styles/globals.css";
import "@courselit/common-widgets/styles.css";
import "@courselit/components-library/styles.css";
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
import FontsInjector from "../components/public/fonts-injector";
import { SessionProvider } from "next-auth/react";

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
                <div
                    style={
                        {
                            //visibility: !mounted ? "hidden" : "visible",
                        }
                    }
                >
                    <Component {...pageProps} />
                </div>
                <CodeInjector router={router} />
                <FontsInjector router={router} />
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
