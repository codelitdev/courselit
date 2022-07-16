import React, { ReactChildren, ReactNode } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./template";
import Scaffold from "./scaffold";
import type { AppState } from "@courselit/state-management";

interface MasterLayoutProps {
    title: string;
    siteInfo: any;
    children: ReactNode;
    layout: Record<string, unknown>[];
}

const MasterLayout = ({
    title,
    siteInfo,
    children,
    layout,
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
                        siteInfo.logopath && siteInfo.logopath.file
                            ? siteInfo.logopath.file
                            : "/favicon.ico"
                    }
                />
                <meta
                    name="viewport"
                    content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                />
            </Head>
            <Template layout={layout}>{children}</Template>
        </>
    );
};

const mapStateToProps = (state: AppState) => ({
    networkAction: state.networkAction,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(MasterLayout);
