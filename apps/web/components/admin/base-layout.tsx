import React, { ReactNode, useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    Rocket,
    Text,
    Person,
    Mail,
    Settings,
    Home,
    Globe,
} from "@courselit/icons";
import {
    CREATOR_AREA_PAGE_TITLE,
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_PRODUCTS,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_USERS,
    SIDEBAR_MENU_MAILS,
    SIDEBAR_MENU_PAGES,
    SIDEBAR_MENU_DASHBOARD,
} from "../../ui-config/strings";
import AppLoader from "../app-loader";
import Head from "next/head";
import { canAccessDashboard } from "../../ui-lib/utils";
import RouteBasedComponentScaffold from "../public/scaffold";
import {
    UIConstants as constants,
    Profile,
    SiteInfo,
} from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import {
    actionCreators,
    AppDispatch,
    AppState,
} from "@courselit/state-management";
import { useSession } from "next-auth/react";
const { permissions } = constants;

const getSidebarMenuItems = (profile: Profile) => {
    const items = [
        {
            label: SIDEBAR_MENU_DASHBOARD,
            href: "/dashboard",
            icon: <Home />,
        },
    ];

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
        items.push({
            label: SIDEBAR_MENU_MAILS,
            href: "/dashboard/mails?tab=Broadcasts",
            icon: <Mail />,
        });
    }

    if (profile.permissions.includes(permissions.manageSite)) {
        items.push({
            label: SIDEBAR_MENU_PAGES,
            href: "/dashboard/pages",
            icon: <Globe />,
        });
    }

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
    profile: Profile;
    siteInfo: SiteInfo;
    children: ReactNode;
    title: string;
    dispatch?: AppDispatch;
}

export const BaseLayoutAdmin = ({
    profile,
    siteInfo,
    children,
    title,
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
            dispatch && dispatch(actionCreators.signedIn());
            dispatch && dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch && dispatch(actionCreators.authChecked());
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [status]);

    const items = getSidebarMenuItems(profile);

    return profile.fetched && canAccessDashboard(profile) ? (
        <>
            <Head>
                <title>
                    {CREATOR_AREA_PAGE_TITLE} {">"} {title}{" "}
                    {siteInfo && siteInfo.title && `| ${siteInfo.title}`}
                </title>
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
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(BaseLayoutAdmin);
