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
import Settings from "../components/Admin/Settings.js";
import { CREATOR_AREA_PAGE_TITLE } from "../config/strings.js";
import MediaManager from "../components/Admin/Media/MediaManager.js";
import Courses from "../components/Admin/Courses";
import Users from "../components/Admin/Users";
import AppLoader from "../components/AppLoader.js";
import Design from "../components/Admin/Design";
import ComponentScaffold from "../components/Public/BaseLayout/ComponentScaffold.js";
import MasterDetails from "../components/Admin/Widgets";
import widgets from "../config/widgets.js";
import Head from "next/head";
import { formulateMediaUrl } from "../lib/utils.js";
import { Grid } from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  loaderContainer: {
    height: "100vh",
    width: "100vw",
  },
});

const Create = (props) => {
  const router = useRouter();
  const classes = useStyles();

  useEffect(() => {
    if (
      props.profile.fetched &&
      !(props.profile.isCreator || props.profile.isAdmin)
    ) {
      router.push("/");
    }
  }, [props.profile.fetched]);

  useEffect(() => {
    if (props.auth.checked && props.auth.guest) {
      router.push("/");
    }
  }, [props.auth.checked]);

  const items = [
    {
      name: "Courses",
      element: <Courses />,
      icon: <LibraryBooks />,
    },
    {
      name: "Media",
      element: <MediaManager onMediaSelected={() => {}} />,
      icon: <PermMedia />,
    },
  ];

  if (props.profile.isAdmin) {
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
          element: <Users />,
          icon: <SupervisedUserCircle />,
        },
        {
          name: "Design & Navigation",
          element: <Design />,
          icon: <Palette />,
        },
        {
          name: "Widgets",
          element: <MasterDetails componentsMap={widgetsMap} />,
          icon: <Widgets />,
        },
        {
          name: "Settings",
          element: <Settings />,
          icon: <SettingsApplications />,
        },
      ]
    );
  }

  return props.profile.fetched &&
    (props.profile.isCreator || props.profile.isAdmin) ? (
    <>
      <Head>
        <title>
          {CREATOR_AREA_PAGE_TITLE}{" "}
          {props.siteInfo &&
            props.siteInfo.title &&
            `| ${props.siteInfo.title}`}
        </title>
        {props.siteInfo && props.siteInfo.logopath && (
          <link
            rel="icon"
            href={formulateMediaUrl(
              props.address.backend,
              props.siteInfo.logopath,
              true
            )}
          />
        )}
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
        />
      </Head>
      <ComponentScaffold items={items} />
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
  address: state.address,
});

export default connect(mapStateToProps)(Create);
