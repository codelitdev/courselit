import React, { ReactChildren, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    LibraryBooks,
    SupervisedUserCircle,
    PermMedia,
    SettingsApplications,
    Palette,
} from "@mui/icons-material";
import { CREATOR_AREA_PAGE_TITLE } from "../../ui-config/strings";
import AppLoader from "../app-loader";
import Head from "next/head";
import { canAccessDashboard, checkPermission } from "../../ui-lib/utils";
import { Grid } from "@mui/material";
import RouteBasedComponentScaffold from "../public/base-layout/route-based-component-scaffold";
import constants from "../../config/constants";
import type Profile from "../../ui-models/profile";
import State from "../../ui-models/state";
import Auth from "../../ui-models/auth";
import SiteInfo from "../../ui-models/site-info";
import Address from "../../ui-models/address";
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

const getSidebarMenuItems = (profile: Profile) => {
    const items = [];

    if (
        checkPermission(profile.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        items.push({
            name: "Courses",
            route: "/dashboard/courses",
            icon: <LibraryBooks />,
        });
    }

    if (
        checkPermission(profile.permissions, [
            permissions.viewAnyMedia,
            permissions.manageMedia,
            permissions.manageAnyMedia,
        ])
    ) {
        items.push({
            name: "Media",
            route: "/dashboard/media",
            icon: <PermMedia />,
        });
    }

    if (profile.permissions.includes(permissions.manageUsers)) {
        items.push({
            name: "Users",
            route: "/dashboard/users",
            icon: <SupervisedUserCircle />,
        });
    }

    if (profile.permissions.includes(permissions.manageSite)) {
        items.push({
            name: "Site",
            route: "/dashboard/design",
            icon: <Palette />,
        });
    }

    if (profile.permissions.includes(permissions.manageSettings)) {
        items.push({
            name: "Settings",
            route: "/dashboard/settings",
            icon: <SettingsApplications />,
        });
    }

    return items;
};

interface BaseLayoutProps {
    auth: Auth;
    profile: Profile;
    siteInfo: SiteInfo;
    children: ReactChildren;
    title: string;
    address: Address;
}

const BaseLayoutAdmin = ({
    auth,
    profile,
    siteInfo,
    children,
    title,
    address,
}: BaseLayoutProps) => {
    const router = useRouter();

    useEffect(() => {
        if (profile.fetched && !canAccessDashboard(profile)) {
            router.push("/");
        }
    }, [profile.fetched]);

    useEffect(() => {
        if (auth.checked && auth.guest) {
            router.push(`/login?redirect=${router.pathname}`);
        }
    }, [auth.checked]);

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

const mapStateToProps = (state: State) => ({
    auth: state.auth,
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(BaseLayoutAdmin);
