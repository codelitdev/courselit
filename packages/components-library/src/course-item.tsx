import * as React from "react";
import { styled } from "@mui/system";
import { Grid, Typography } from "@mui/material";
import Image from "./image";
import type { Course, SiteInfo } from "@courselit/common-models";
import PriceTag from "./pricetag";
import Link from "./link";

interface CourseItemProps {
    course: Course;
    siteInfo: SiteInfo;
    freeCostCaption?: string;
    thumbnailLoading?: "eager" | "lazy";
}

const CourseItem = (props: CourseItemProps) => {
    const {
        course,
        siteInfo,
        freeCostCaption,
        thumbnailLoading = "lazy",
    } = props;

    return (
        <Grid
            item
            xs={12}
            md={6}
            sx={{
                mb: 3,
            }}
        >
            <Link
                href={`/${course.type === "BLOG" ? "blog" : "course"}/${
                    course.slug
                }/${course.courseId}`}
                sxProps={{
                    textDecoration: "none",
                    color: "inherit",
                    mb: 2,
                    display: "block",
                    "&:hover": {
                        cursor: "pointer",
                    },
                }}
            >
                <Grid
                    item
                    container
                    direction="column"
                    component="article"
                    spacing={1}
                >
                    <Grid item>
                        <Image
                            src={
                                course.featuredImage &&
                                (course.featuredImage.file ||
                                    course.featuredImage.thumbnail)
                            }
                            loading={thumbnailLoading}
                            height={{
                                xs: 220,
                                sm: 414,
                                md: 276,
                                lg: 392,
                                xl: 704,
                            }}
                            sizes="40vw"
                        />
                    </Grid>
                    {course.type !== "BLOG" && (
                        <Grid item>
                            <Typography variant="overline">
                                {course.type.toUpperCase()}
                            </Typography>
                        </Grid>
                    )}
                    <Grid item>
                        <Typography variant="h5">{course.title}</Typography>
                    </Grid>
                    <Grid item>
                        <Typography variant="body1" color="textSecondary">
                            {course.description}
                        </Typography>
                    </Grid>
                    {!(course.type === "BLOG") && (
                        <Grid item>
                            <PriceTag
                                cost={course.cost}
                                freeCostCaption={freeCostCaption}
                                currencyISOCode={siteInfo.currencyISOCode}
                            />
                        </Grid>
                    )}
                </Grid>
            </Link>
        </Grid>
    );
};

export default CourseItem;
