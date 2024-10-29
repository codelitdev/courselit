import React, { ReactNode } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./template";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import type {
    Media,
    Theme,
    Typeface,
    WidgetInstance,
} from "@courselit/common-models";
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
    description?: string;
    socialImage?: Media;
    robotsAllowed?: boolean;
    state: AppState;
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
    description,
    socialImage,
    robotsAllowed = true,
    state,
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

    const siteTitle = title || siteInfo.title;
    const siteDescription = description || siteInfo.subtitle;
    const siteImage = socialImage || siteInfo.logo;

    return (
        <>
            <Head>
                <title>{siteTitle}</title>
                <meta property="og:title" content={siteTitle} />
                <meta name="twitter:title" content={siteTitle} />
                <link
                    rel="icon"
                    type="image/x-icon"
                    href={
                        siteInfo.logo && siteInfo.logo.file
                            ? siteInfo.logo.file
                            : "/favicon.ico"
                    }
                />
                <meta
                    name="viewport"
                    content="initial-scale=1, width=device-width, shrink-to-fit=no"
                />
                {siteDescription && (
                    <>
                        <meta name="description" content={siteDescription} />
                        <meta
                            property="og:description"
                            content={siteDescription}
                        />
                        <meta
                            name="twitter:description"
                            content={siteDescription}
                        />
                    </>
                )}
                {!robotsAllowed && <meta name="robots" content="noindex" />}
                {siteImage && (
                    <>
                        <meta property="og:image" content={siteImage.file} />
                        <meta
                            name="twitter:card"
                            content="summary_large_image"
                        />
                        <meta name="twitter:image" content={siteImage.file} />
                        {siteImage.caption && (
                            <>
                                <meta
                                    property="og:image:alt"
                                    content={siteImage.caption}
                                />
                                <meta
                                    name="twitter:image:alt"
                                    content={siteImage.caption}
                                />
                            </>
                        )}
                    </>
                )}
            </Head>
            <Template
                layout={layout}
                childrenOnTop={childrenOnTop}
                pageData={pageData}
                state={state}
                dispatch={dispatch}
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
    state: state,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(MasterLayout);
