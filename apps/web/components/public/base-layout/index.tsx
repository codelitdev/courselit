import React, { ReactNode } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./template";
import type { AppState } from "@courselit/state-management";
import type { Theme, Typeface, WidgetInstance } from "@courselit/common-models";

interface MasterLayoutProps {
    title: string;
    siteInfo: any;
    layout: WidgetInstance[];
    pageData?: Record<string, unknown>;
    children?: ReactNode;
    childrenOnTop?: boolean;
    typefaces: Typeface[];
    theme: Theme;
}

const MasterLayout = ({
    title,
    siteInfo,
    children,
    layout,
    pageData = {},
    childrenOnTop = false,
}: MasterLayoutProps) => {
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

export default connect(mapStateToProps)(MasterLayout);
