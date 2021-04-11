import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
  LibraryBooks,
  SupervisedUserCircle,
  PermMedia,
  SettingsApplications,
  Palette,
  Widgets,
  List,
} from "@material-ui/icons";
import { CREATOR_AREA_PAGE_TITLE } from "../../config/strings.js";
import AppLoader from "../../components/AppLoader.js";
import Head from "next/head";
import { canAccessDashboard, checkPermission } from "../../lib/utils.js";
import { Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import RouteBasedComponentScaffold from "../Public/BaseLayout/RouteBasedComponentScaffold.js";
import {
  addressProps,
  authProps,
  profileProps,
  siteInfoProps,
} from "../../types.js";
import { permissions } from "../../config/constants.js";

const useStyles = makeStyles({
  loaderContainer: {
    height: "100vh",
    width: "100vw",
  },
});

const getSidebarMenuItems = (profile) => {
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

  if (
    checkPermission(profile.permissions, [
      permissions.manageLayout,
      permissions.manageThemes,
    ])
  ) {
    items.push({
      name: "Appearance",
      route: "/dashboard/design",
      icon: <Palette />,
    });
  }

  if (profile.permissions.includes(permissions.manageMenus)) {
    items.push({
      name: "Menus",
      route: "/dashboard/menus",
      icon: <List />,
    });
  }

  if (profile.permissions.includes(permissions.manageWidgets)) {
    items.push({
      name: "Widgets",
      route: "/dashboard/widgets",
      icon: <Widgets />,
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

const BaseLayoutAdmin = ({
  auth,
  profile,
  siteInfo,
  children,
  title,
  address,
}) => {
  const router = useRouter();
  const classes = useStyles();

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
        {siteInfo && siteInfo.logopath && (
          <link rel="icon" href={siteInfo.logopath} />
        )}
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
    <Grid
      container
      justify="center"
      alignItems="center"
      className={classes.loaderContainer}
    >
      <Grid item>
        <AppLoader />
      </Grid>
    </Grid>
  );
};

BaseLayoutAdmin.propTypes = {
  auth: authProps,
  profile: profileProps,
  siteInfo: siteInfoProps,
  children: PropTypes.object,
  title: PropTypes.string,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  siteInfo: state.siteinfo,
  address: state.address,
});

export default connect(mapStateToProps)(BaseLayoutAdmin);
