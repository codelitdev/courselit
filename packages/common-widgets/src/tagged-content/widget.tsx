import * as React from "react";
import { Grid, Typography, Button, Theme } from "@mui/material";
import { Section, CourseItem } from "@courselit/components-library";
import Link from "next/link";
import { Course, WidgetProps } from "@courselit/common-models";
import MuiLink from "@mui/material/Link";

const Widget = (props: WidgetProps) => {
    const { config, state, settings, id } = props;
    const [posts, setPosts] = React.useState<Course[]>(state.widgetsData[id]);
    const BTN_LOAD_MORE = "View all";

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
                            <Typography variant="h2">
                                {settings.title}
                            </Typography>
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
                                    freeCostCaption={
                                        config.FREE_COST_CAPTION as string
                                    }
                                    siteInfo={state.siteinfo}
                                    course={post}
                                    thumbnailLoading="eager"
                                />
                            ))}
                        </Grid>
                    </Grid>
                    {posts.length > 0 && (
                        <Grid item xs={12}>
                            <Button disableElevation variant="outlined">
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

Widget.getData = (id: string, settings: Record<string, unknown>) => `
    ${id}: getCourses(offset: 1, tag: "${settings && settings.tag}") {
        id,
        title,
        cost,
        featuredImage {
            thumbnail 
        },
        slug,
        courseId,
        isBlog,
        description
    }
`;

export default Widget;
