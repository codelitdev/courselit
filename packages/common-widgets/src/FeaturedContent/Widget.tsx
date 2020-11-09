import * as React from "react";
import { Grid, Typography, Button } from "@material-ui/core";
import Item from "./Item";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { WidgetProps } from "@courselit/components-library";
import Link from "next/link";

const useStyles = makeStyles((theme: any) => ({
  content: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(2),
    background: "#eee",
  },
  header: {
    marginLeft: theme.spacing(2),
  },
  headerTop: {
    marginBottom: theme.spacing(2),
  },
  link: {
    textDecoration: "none",
    color: "inherit",
  },
}));

export interface FeaturedWidgetProps extends WidgetProps {
  dispatch: any;
}

const Widget = (props: FeaturedWidgetProps) => {
  const { fetchBuilder, utilities, config, dispatch, name } = props;
  const [posts, setPosts] = React.useState([]);
  const [postsOffset, setPostsOffset] = React.useState(1);
  const classes = useStyles();
  const BTN_LOAD_MORE = "View all";
  const SUBHEADER_FEATURED_SECTION = "";
  const [settings, setSettings] = React.useState<any>({});

  React.useEffect(() => {
    getSettings();
    getPosts();
  }, [postsOffset]);

  const getPosts = async () => {
    const query = `
    query {
      courses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
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
    const query = `
    query {
      settings: getWidgetSettings(name: "${name}") {
        settings
      }
    }
    `;

    const fetch = fetchBuilder.setPayload(query).build();
    try {
      dispatch({ type: "NETWORK_ACTION", flag: true });
      const response = await fetch.exec();
      if (response.settings) {
        // console.log(settings, response.settings, response.settings.settings);
        setSettings(JSON.parse(response.settings.settings));
      }
      console.log(settings);
    } catch (err) {
    } finally {
      dispatch({ type: "NETWORK_ACTION", flag: false });
    }
  };

  return posts.length > 0 ? (
    <Grid item xs={12} className={classes.content}>
      <Grid container component="section">
        <Grid item container className={classes.header}>
          <Grid item xs={12} className={classes.headerTop}>
            <Typography variant="h4">{settings.title}</Typography>
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
            <Button>
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
