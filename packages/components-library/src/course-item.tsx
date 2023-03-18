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

    const href =
        course.type === "BLOG"
            ? `/blog/${course.slug}/${course.courseId}`
            : `/p/${course.pageId}`;

    return (
        <Grid
            item
            xs={12}
            md={4}
            lg={3}
            sx={{
                mb: 3,
            }}
        >
            <Link
                href={href}
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
                <Grid container direction="column" component="article">
                    <Grid item>
                        <Image
                            src={
                                course.featuredImage &&
                                (course.featuredImage.file ||
                                    course.featuredImage.thumbnail)
                            }
                            loading={thumbnailLoading}
                            sizes="40vw"
                        />
                    </Grid>
                    {course.type !== "BLOG" && (
                        <Grid item>
                            <Typography
                                variant="overline"
                                color="textSecondary"
                            >
                                {course.type.toUpperCase()}
                            </Typography>
                        </Grid>
                    )}
                    <Grid item>
                        <Typography variant="h6">{course.title}</Typography>
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
