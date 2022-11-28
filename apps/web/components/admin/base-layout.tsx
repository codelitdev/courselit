import React, { ReactNode, useEffect } from "react";
import { styled } from "@mui/material/styles";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
    LibraryBooks,
    SupervisedUserCircle,
    SettingsApplications,
    Palette,
    Article,
} from "@mui/icons-material";
import { CREATOR_AREA_PAGE_TITLE } from "../../ui-config/strings";
import AppLoader from "../app-loader";
import Head from "next/head";
import { canAccessDashboard, checkPermission } from "../../ui-lib/utils";
import { Grid } from "@mui/material";
import RouteBasedComponentScaffold from "../public/scaffold";
import constants from "../../config/constants";
import type Profile from "../../ui-models/profile";
import State from "../../ui-models/state";
import Auth from "../../ui-models/auth";
import SiteInfo from "../../ui-models/site-info";
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
            label: "Products",
            href: "/dashboard/products",
            icon: <LibraryBooks />,
        });
        items.push({
            label: "Blogs",
            href: "/dashboard/blogs",
            icon: <Article />,
        });
    }

    // if (
    //     checkPermission(profile.permissions, [
    //         permissions.viewAnyMedia,
    //         permissions.manageMedia,
    //         permissions.manageAnyMedia,
    //     ])
    // ) {
    //     items.push({
    //         label: "Media",
    //         href: "/dashboard/media",
    //         icon: <PermMedia />,
    //     });
    // }

    if (profile.permissions.includes(permissions.manageUsers)) {
        items.push({
            label: "Users",
            href: "/dashboard/users",
            icon: <SupervisedUserCircle />,
        });
    }

    if (profile.permissions.includes(permissions.manageSite)) {
        items.push({
            label: "Site",
            href: "/dashboard/design",
            icon: <Palette />,
        });
    }

    if (profile.permissions.includes(permissions.manageSettings)) {
        items.push({
            label: "Settings",
            href: "/dashboard/settings",
            icon: <SettingsApplications />,
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
}

const BaseLayoutAdmin = ({
    auth,
    profile,
    siteInfo,
    children,
    title,
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

const mapStateToProps = (state: State) => ({
    auth: state.auth,
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(BaseLayoutAdmin);
