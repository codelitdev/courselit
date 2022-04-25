import React, { ReactChildren } from "react";
import { connect } from "react-redux";
import Head from "next/head";
import Template from "./Template";
import Scaffold from "./Scaffold";
import type { AppState } from "@courselit/state-management";

interface MasterLayoutProps {
  title: string;
  siteInfo: any;
  children: ReactChildren;
}

const MasterLayout = (props: MasterLayoutProps) => {
  return (
    <>
      <Head>
        <title>
          {props.title} | {props.siteInfo.title}
        </title>
        <link
          rel="icon"
          href={
            props.siteInfo.logopath
              ? props.siteInfo.logopath.file
              : "/courselit_backdrop_square.webp"
          }
        />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
      </Head>
      <Scaffold>
        <Template>{props.children}</Template>
      </Scaffold>
    </>
  );
};

const mapStateToProps = (state: AppState) => ({
  networkAction: state.networkAction,
  siteInfo: state.siteinfo,
  layout: state.layout,
  address: state.address,
});

export default connect(mapStateToProps)(MasterLayout);
