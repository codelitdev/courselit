import React, { ReactNode, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    LibraryBooksOutlined,
    SupervisedUserCircleOutlined,
    SettingsApplicationsOutlined,
    PaletteOutlined,
    ArticleOutlined,
    MailOutlined,
} from "@mui/icons-material";
import {
    CREATOR_AREA_PAGE_TITLE,
    SIDEBAR_MENU_BLOGS,
    SIDEBAR_MENU_PRODUCTS,
    SIDEBAR_MENU_SETTINGS,
    SIDEBAR_MENU_SITE,
    SIDEBAR_MENU_USERS,
    SIDEBAR_MENU_MAILS,
} from "../../ui-config/strings";
import AppLoader from "../app-loader";
import Head from "next/head";
import { canAccessDashboard } from "../../ui-lib/utils";
import { Grid } from "@mui/material";
import RouteBasedComponentScaffold from "../public/scaffold";
import type Profile from "../../ui-models/profile";
import Auth from "../../ui-models/auth";
import SiteInfo from "../../ui-models/site-info";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { AppState } from "@courselit/state-management";
const { permissions } = constants;

const PREFIX = "BaseLayout";

const classes = {
    loaderContainer: `${PREFIX}-loaderContainer`,
};

const StyledGrid = styled(Grid)({
    [`&.${classes.loaderContainer}`]: {
        height: "100vh",
        width: "100vw",
    },
});

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
            icon: <LibraryBooksOutlined />,
        });
        items.push({
            label: SIDEBAR_MENU_BLOGS,
            href: "/dashboard/blogs",
            icon: <ArticleOutlined />,
        });
    }

    if (profile.permissions.includes(permissions.manageUsers)) {
        items.push({
            label: SIDEBAR_MENU_USERS,
            href: "/dashboard/users",
            icon: <SupervisedUserCircleOutlined />,
        });
        if (featureFlags.includes("mail")) {
            items.push({
                label: SIDEBAR_MENU_MAILS,
                href: "/dashboard/mails",
                icon: <MailOutlined />,
            });
        }
    }

    if (profile.permissions.includes(permissions.manageSite)) {
        items.push({
            label: SIDEBAR_MENU_SITE,
            href: "/dashboard/design",
            icon: <PaletteOutlined />,
        });
    }

    if (profile.permissions.includes(permissions.manageSettings)) {
        items.push({
            label: SIDEBAR_MENU_SETTINGS,
            href: "/dashboard/settings",
            icon: <SettingsApplicationsOutlined />,
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
}

const BaseLayoutAdmin = ({
    auth,
    profile,
    siteInfo,
    children,
    title,
    featureFlags,
}: BaseLayoutProps) => {
    const router = useRouter();

    useEffect(() => {
        if (profile.fetched && !canAccessDashboard(profile)) {
            router.push("/");
        }
    }, [profile.fetched]);

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.asPath}`);
        }
    }, [auth.checked]);

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
        <StyledGrid
            container
            justifyContent="center"
            alignItems="center"
            className={classes.loaderContainer}
        >
            <Grid item>
                <AppLoader />
            </Grid>
        </StyledGrid>
    );
};

const mapStateToProps = (state: AppState) => ({
    auth: state.auth,
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
    featureFlags: state.featureFlags,
});

export default connect(mapStateToProps)(BaseLayoutAdmin);
