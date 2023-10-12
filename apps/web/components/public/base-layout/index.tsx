import React, { ReactNode } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./template";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import type { Theme, Typeface, WidgetInstance } from "@courselit/common-models";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface MasterLayoutProps {
    title: string;
    siteInfo: any;
    layout: WidgetInstance[];
    pageData?: Record<string, unknown>;
    children?: ReactNode;
    childrenOnTop?: boolean;
    typefaces: Typeface[];
    theme: Theme;
    dispatch: AppDispatch;
}

const MasterLayout = ({
    title,
    siteInfo,
    children,
    layout,
    typefaces,
    dispatch,
    pageData = {},
    childrenOnTop = false,
}: MasterLayoutProps) => {
    const { status } = useSession();

    const primaryFontFamily = typefaces.filter(
        (x) => x.section === "default",
    )[0]?.typeface;

    useEffect(() => {
        if (status === "authenticated") {
            dispatch(actionCreators.signedIn());
            dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch(actionCreators.authChecked());
        }
    }, [status]);

    return (
        <>
            <Head>
                <title>{title || siteInfo.title}</title>
                <link
                    rel="icon"
                    href={
                        siteInfo.logo && siteInfo.logo.file
                            ? siteInfo.logo.file
                            : "/favicon.ico"
                    }
                />
                <meta
                    name="viewport"
                    content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                />
            </Head>
            <Template
                layout={layout}
                childrenOnTop={childrenOnTop}
                pageData={pageData}
            >
                {children}
            </Template>
            <style jsx global>{`
                :root {
                    --primary-font: ${primaryFontFamily}, sans-serif;
                    --secondary-font: ${primaryFontFamily}, sans-serif;
                }
            `}</style>
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    networkAction: state.networkAction,
    siteInfo: state.siteinfo,
    address: state.address,
    typefaces: state.typefaces,
    theme: state.theme,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(MasterLayout);
