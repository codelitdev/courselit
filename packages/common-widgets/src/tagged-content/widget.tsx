import * as React from "react";
import { Grid, Typography, Button, Theme } from "@mui/material";
import { Section, CourseItem } from "@courselit/components-library";
import Link from "next/link";
import Settings from "./settings";
import { Course, FetchBuilder, WidgetProps } from "@courselit/common-models";
import MuiLink from "@mui/material/Link";
import Metadata from "./metadata";

export interface FeaturedWidgetProps extends WidgetProps {
  dispatch: any;
}

const Widget = (props: FeaturedWidgetProps) => {
  const { config, state, name } = props;
  const [posts, setPosts] = React.useState<Course[]>(
    state.widgetsData[name].courses as Course[]
  );
  const BTN_LOAD_MORE = "View all";
  const [settings, setSettings] = React.useState<Settings>(
    state.widgetsData[name].settings as Settings
  );

  return posts.length > 0 ? (
    <Section>
      <Grid
        item
        xs={12}
        sx={{
          background: settings.backgroundColor || "inherit",
          padding: 2,
        }}
      >
        <Grid container spacing={2}>
          <Grid item container spacing={1}>
            <Grid
              item
              xs={12}
              sx={{
                marginBottom: 1,
              }}
            >
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
                <CourseItem
                  key={index}
                  freeCostCaption={config.FREE_COST_CAPTION as string}
                  siteInfo={state.siteinfo}
                  course={post}
                />
              ))}
            </Grid>
          </Grid>
          {posts.length > 0 && (
            <Grid item xs={12}>
              <Button disableElevation>
                <Link href={`/tag/${settings.tag}`}>
                  <MuiLink
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    {BTN_LOAD_MORE}
                  </MuiLink>
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

Widget.getData = async function getData({
  fetchBuilder,
}: {
  fetchBuilder: FetchBuilder;
}) {
  const settingsQuery = `
    query {
      settings: getWidgetSettings(name: "${Metadata.name}") {
        settings
      }
    }
    `;

  const fetch = fetchBuilder.setPayload(settingsQuery).build();
  let result: Record<string, unknown> = {};
  try {
    const response = await fetch.exec();
    if (!response.settings) {
      return result;
    }
    result.settings = JSON.parse(response.settings.settings);

    const query = `
    query {
        courses: getCourses(offset: 1, tag: "${(result.settings as any).tag}") {
            id,
            title,
            cost,
            featuredImage {
                file
            },
            slug,
            courseId,
            isBlog,
            description
        }
    }
    `;

    const fetchCourse = fetchBuilder.setPayload(query).build();
    const responseCourse = await fetchCourse.exec();
    if (responseCourse.courses) {
      result.courses = responseCourse.courses;
    }
  } catch (err) {
    console.error(err);
  }

  return result;
};

export default Widget;
