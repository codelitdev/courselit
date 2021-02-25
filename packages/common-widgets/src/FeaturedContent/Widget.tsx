import * as React from "react";
import { Grid, Typography, Button, Theme } from "@material-ui/core";
import Item from "./Item";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { WidgetProps, WidgetHelpers } from "@courselit/components-library";
import Link from "next/link";
import Settings from "./Settings";

const useStyles = ({ backgroundColor }: Settings) =>
  makeStyles((theme: Theme) => ({
    content: {
      [theme.breakpoints.down("sm")]: {
        padding: theme.spacing(2),
      },
      paddingTop: theme.spacing(2),
      marginBottom: theme.spacing(2),
      background: backgroundColor || "inherit",
    },
    header: {
      [theme.breakpoints.up("md")]: {
        marginLeft: theme.spacing(2),
      },
      marginBottom: theme.spacing(2),
    },
    headerTop: {
      marginBottom: theme.spacing(1),
    },
    link: {
      textDecoration: "none",
      color: "inherit",
    },
    callToAction: {
      [theme.breakpoints.up("md")]: {
        marginLeft: theme.spacing(2),
      },
      marginBottom: theme.spacing(2),
    },
  }));

export interface FeaturedWidgetProps extends WidgetProps {
  dispatch: any;
}

const Widget = (props: FeaturedWidgetProps) => {
  const { fetchBuilder, utilities, config, dispatch, name } = props;
  const [posts, setPosts] = React.useState([]);
  const [postsOffset] = React.useState(1);
  const BTN_LOAD_MORE = "View all";
  const [settings, setSettings] = React.useState<Settings>({
    title: "",
    subtitle: "",
  });
  const classes = useStyles(settings)();

  React.useEffect(() => {
    getSettings();
    getPosts();
  }, [postsOffset]);

  const getPosts = async () => {
    const query = `
    query {
      courses: getCourses(offset: 1, onlyShowFeatured: true) {
        id,
        title,
        cost,
        featuredImage,
        slug,
        courseId
      }
    }
    `;

    const fetch = fetchBuilder.setPayload(query).build();
    try {
      dispatch({ type: "NETWORK_ACTION", flag: true });
      const response = await fetch.exec();
      if (response.courses) {
        setPosts([...posts, ...response.courses]);
      }
    } catch (err) {
    } finally {
      dispatch({ type: "NETWORK_ACTION", flag: false });
    }
  };

  const getSettings = async () => {
    const settings: any = await WidgetHelpers.getWidgetSettings({
      widgetName: name,
      fetchBuilder,
      dispatch,
    });
    setSettings(settings);
  };

  return posts.length > 0 ? (
    <Grid item xs={12} className={classes.content}>
      <Grid container component="section">
        <Grid item container className={classes.header}>
          <Grid item xs={12} className={classes.headerTop}>
            <Typography variant="h2">{settings.title}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body1" color="textSecondary">
              {settings.subtitle}
            </Typography>
          </Grid>
        </Grid>
        <Grid item container xs={12}>
          {posts.map((post, index) => (
            <Item
              key={index}
              appUtilities={utilities}
              appConfig={config}
              course={post}
            />
          ))}
        </Grid>
        {posts.length > 0 && (
          <Grid item xs={12}>
            <Button
              variant="contained"
              disableElevation
              className={classes.callToAction}
            >
              <Link href="/featured">
                <a className={classes.link}>{BTN_LOAD_MORE}</a>
              </Link>
            </Button>
          </Grid>
        )}
      </Grid>
    </Grid>
  ) : (
    <></>
  );
};

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(() => ({}), mapDispatchToProps)(Widget);
