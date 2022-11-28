import React, { ReactNode } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./template";
import type { AppState } from "@courselit/state-management";
import type { WidgetInstance } from "@courselit/common-models";

interface MasterLayoutProps {
    title: string;
    siteInfo: any;
    layout: WidgetInstance[];
    children?: ReactNode;
    childrenOnTop?: boolean;
}

const MasterLayout = ({
    title,
    siteInfo,
    children,
    layout,
    childrenOnTop = false,
}: MasterLayoutProps) => {
    return (
        <>
            <Head>
                <title>
                    {title} | {siteInfo.title}
                </title>
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
            <Template layout={layout} childrenOnTop={childrenOnTop}>
                {children}
            </Template>
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    networkAction: state.networkAction,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(MasterLayout);
