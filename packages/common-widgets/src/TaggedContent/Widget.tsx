import * as React from "react";
import { Grid, Typography, Button, Theme } from "@mui/material";
import Item from "./Item";
import { WidgetHelpers, Section } from "@courselit/components-library";
import Link from "next/link";
import Settings from "./Settings";
import type { WidgetProps } from "@courselit/common-models";
import MuiLink from "@mui/material/Link";

export interface FeaturedWidgetProps extends WidgetProps {
  dispatch: any;
}

const Widget = (props: FeaturedWidgetProps) => {
  const { fetchBuilder, utilities, config, dispatch, name } = props;
  const [posts, setPosts] = React.useState([]);
  const [postsOffset] = React.useState(1);
  const BTN_LOAD_MORE = "View all";
  const [settings, setSettings] = React.useState<Settings>({
    tag: "",
    title: "",
    subtitle: "",
  });

  React.useEffect(() => {
    getSettings();
    getPosts();
  }, [postsOffset]);

  const getPosts = async () => {
    const query = `
    query {
      courses: getCourses(offset: 1, tag: "${settings.tag}") {
        id,
        title,
        cost,
        featuredImage {
          file
        },
        slug,
        courseId,
        isBlog
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

    if (settings) {
      setSettings(settings);
    }
  };

  return posts.length > 0 ? (
    <Section>
      <Grid item xs={12} sx={{
        background: settings.backgroundColor || "inherit",
      }}>
        <Grid container spacing={2}>
          <Grid item container spacing={1}>
            <Grid item xs={12} sx={{
                marginBottom: 1,
            }}>
              <Typography variant="h2">{settings.title}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body1" color="textSecondary">
                {settings.subtitle}
              </Typography>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {posts.map((post, index) => (
                <Item
                  key={index}
                  appUtilities={utilities}
                  appConfig={config}
                  course={post}
                />
              ))}
            </Grid>
          </Grid>
          {posts.length > 0 && (
            <Grid item xs={12}>
              <Button disableElevation> 
                <Link href="/featured">
                  <MuiLink sx={{
                    textDecoration: "none",
                    color: "inherit",
                  }}>{BTN_LOAD_MORE}</MuiLink>
                </Link>
              </Button>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Section>
  ) : (
    <></>
  );
};

export default Widget;
