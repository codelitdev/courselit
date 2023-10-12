import React, { ReactNode, useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import { Rocket, Text, Person, Mail, Settings } from "@courselit/icons";
import {
    CREATOR_AREA_PAGE_TITLE,
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_PRODUCTS,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_USERS,
    SIDEBAR_MENU_MAILS,
} from "../../ui-config/strings";
import AppLoader from "../app-loader";
import Head from "next/head";
import { canAccessDashboard } from "../../ui-lib/utils";
import RouteBasedComponentScaffold from "../public/scaffold";
import type Profile from "../../ui-models/profile";
import Auth from "../../ui-models/auth";
import SiteInfo from "../../ui-models/site-info";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { useSession } from "next-auth/react";
const { permissions } = constants;

const getSidebarMenuItems = (profile: Profile, featureFlags: string[]) => {
    const items = [];

    if (
        checkPermission(profile.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        items.push({
            label: SIDEBAR_MENU_PRODUCTS,
            href: "/dashboard/products",
            icon: <Rocket />,
        });
        items.push({
            label: SIDEBAR_MENU_BLOGS,
            href: "/dashboard/blogs",
            icon: <Text />,
        });
    }

    if (profile.permissions.includes(permissions.manageUsers)) {
        items.push({
            label: SIDEBAR_MENU_USERS,
            href: "/dashboard/users",
            icon: <Person />,
        });
        if (featureFlags.includes("mail")) {
            items.push({
                label: SIDEBAR_MENU_MAILS,
                href: "/dashboard/mails",
                icon: <Mail />,
            });
        }
    }

    /*
    if (profile.permissions.includes(permissions.manageSite)) {
        items.push({
            label: SIDEBAR_MENU_SITE,
            href: "/dashboard/design",
            icon: <Desktop />,
        });
    }
    */

    if (profile.permissions.includes(permissions.manageSettings)) {
        items.push({
            label: SIDEBAR_MENU_SETTINGS,
            href: "/dashboard/settings",
            icon: <Settings />,
        });
    }

    return items;
};

interface BaseLayoutProps {
    auth: Auth;
    profile: Profile;
    siteInfo: SiteInfo;
    children: ReactNode;
    title: string;
    featureFlags: string[];
    dispatch: AppDispatch;
}

const BaseLayoutAdmin = ({
    auth,
    profile,
    siteInfo,
    children,
    title,
    featureFlags,
    dispatch,
}: BaseLayoutProps) => {
    const { status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (profile.fetched && !canAccessDashboard(profile)) {
            router.push("/");
        }
    }, [profile.fetched]);

    useEffect(() => {
        if (status === "authenticated") {
            dispatch(actionCreators.signedIn());
            dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch(actionCreators.authChecked());
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [status]);

    const items = getSidebarMenuItems(profile, featureFlags);

    return profile.fetched && canAccessDashboard(profile) ? (
        <>
            <Head>
                <title>
                    {CREATOR_AREA_PAGE_TITLE} {">"} {title}{" "}
                    {siteInfo && siteInfo.title && `| ${siteInfo.title}`}
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
            <RouteBasedComponentScaffold items={items}>
                <div>{children}</div>
            </RouteBasedComponentScaffold>
        </>
    ) : (
        <div className="flex justify-center items-center h-screen w-full">
            <AppLoader />
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
    featureFlags: state.featureFlags,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BaseLayoutAdmin);
