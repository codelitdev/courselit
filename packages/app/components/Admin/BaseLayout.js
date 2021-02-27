import { useEffect } from "react";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import {
  LibraryBooks,
  SupervisedUserCircle,
  PermMedia,
  SettingsApplications,
  Palette,
  Widgets,
} from "@material-ui/icons";
import Settings from "../../components/Admin/Settings.js";
import { CREATOR_AREA_PAGE_TITLE } from "../../config/strings.js";
import MediaManager from "../../components/Admin/Media/MediaManager.js";
import Courses from "../../components/Admin/Courses";
import Users from "../../components/Admin/Users";
import AppLoader from "../../components/AppLoader.js";
import Design from "../../components/Admin/Design";
import MasterDetails from "../../components/Admin/Widgets";
import widgets from "../../config/widgets.js";
import Head from "next/head";
import { MEDIA_BACKEND } from "../../config/constants.js";
import { formulateMediaUrl } from "../../lib/utils.js";
import { Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import RouteBasedComponentScaffold from "../Public/BaseLayout/RouteBasedComponentScaffold.js";

const useStyles = makeStyles({
  loaderContainer: {
    height: "100vh",
    width: "100vw",
  },
});

const BaseLayoutAdmin = ({ auth, profile, siteInfo }) => {
  const router = useRouter();
  const classes = useStyles();

  useEffect(() => {
    if (
      profile.fetched &&
      !(profile.isCreator || profile.isAdmin)
    ) {
      router.push("/");
    }
  }, [profile.fetched]);

  useEffect(() => {
    if (auth.checked && auth.guest) {
      router.push("/");
    }
  }, [auth.checked]);

  const items = [
    {
      name: "Courses",
    //   element: <Courses />,
      route: "/dashboard/courses",
      icon: <LibraryBooks />,
    },
    {
      name: "Media",
      route: "/dashboard/media",
        //   element: <MediaManager onMediaSelected={() => {}} />,
      icon: <PermMedia />,
    },
  ];

  if (profile.isAdmin) {
    const widgetsMap = {};
    Object.keys(widgets).map((name) => {
      widgetsMap[widgets[name].metadata.name] = {
        icon: widgets[name].metadata.icon,
        caption: widgets[name].metadata.displayName,
        component: widgets[name].adminWidget,
      };
    });

    items.push(
      ...[
        {
          name: "Users",
          route: "/dashboard/users",
        //   element: <Users />,
          icon: <SupervisedUserCircle />,
        },
        {
          name: "Design & Navigation",
          route: "/dashboard/design",
        //   element: <Design />,
          icon: <Palette />,
        },
        {
          name: "Widgets",
          route: "/dashboard/widgets",
        //   element: <MasterDetails componentsMap={widgetsMap} />,
          icon: <Widgets />,
        },
        {
          name: "Settings",
          route: "/dashboard/settings",
        //   element: <Settings />,
          icon: <SettingsApplications />,
        },
      ]
    );
  }

  return profile.fetched &&
    (profile.isCreator || profile.isAdmin) ? (
    <>
      <Head>
        <title>
          {CREATOR_AREA_PAGE_TITLE}{" "}
          {siteInfo &&
            siteInfo.title &&
            `| ${siteInfo.title}`}
        </title>
        {siteInfo && siteInfo.logopath && (
          <link
            rel="icon"
            href={formulateMediaUrl(
              MEDIA_BACKEND,
              siteInfo.logopath,
              true
            )}
          />
        )}
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
      </Head>
      <RouteBasedComponentScaffold items={items} />
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

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(BaseLayoutAdmin);
