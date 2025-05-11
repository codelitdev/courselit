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
    // Theme,
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
    dispatch: AppDispatch;
    description?: string;
    socialImage?: Media;
    robotsAllowed?: boolean;
    state: AppState;
    theme: Theme;
}

export const MasterLayout = ({
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
    theme,
}: MasterLayoutProps) => {
    const { status } = useSession();
    state.theme = theme;

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
            {/* <span className={cn(
                "hidden",
                "transition-all transition-colors transition-opacity transition-shadow transition-transform transition-none",
                "duration-100 duration-200 duration-300 duration-400 duration-500 duration-600 duration-700 duration-800 duration-900 duration-1000",
                "ease-in ease-out ease-in-out ease-linear",
                "hover:scale-0 hover:scale-50 hover:scale-75 hover:scale-90 hover:scale-95 hover:scale-100 hover:scale-105 hover:scale-110 hover:scale-125 hover:scale-150",
                "hover:translate-x-1 hover:translate-x-2 hover:translate-x-3 hover:translate-x-4 hover:translate-x-5 hover:translate-x-6 hover:translate-x-7 hover:translate-x-8 hover:translate-x-9 hover:translate-x-10 hover:-translate-x-1 hover:-translate-x-2 hover:-translate-x-3 hover:-translate-x-4 hover:-translate-x-5 hover:-translate-x-6 hover:-translate-x-7 hover:-translate-x-8 hover:-translate-x-9 hover:-translate-x-10"
            )}></span> */}
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
    state: state,
    theme: state.theme,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(MasterLayout);
