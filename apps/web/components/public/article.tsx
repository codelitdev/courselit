import React from "react";
import { Typography, Grid, Chip, Button } from "@mui/material";
import { formattedLocaleDate, isEnrolled } from "../../ui-lib/utils";
import { connect } from "react-redux";
import {
    PriceTag,
    Image,
    Link,
    TextRenderer,
} from "@courselit/components-library";
import { ENROLL_BUTTON_TEXT, FREE_COST } from "../../ui-config/strings";
import dynamic from "next/dynamic";
import { AppState } from "@courselit/state-management";
import { Course, Profile, SiteInfo } from "@courselit/common-models";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";

const { permissions } = constants;

const BuyButton = dynamic(() => import("./checkout"));

interface ArticleProps {
    course: Course;
    options: ArticleOptionsProps;
    profile: Profile;
    siteInfo: SiteInfo;
}

interface ArticleOptionsProps {
    showAttribution?: boolean;
    showEnrollmentArea?: boolean;
}

const Article = (props: ArticleProps) => {
    const { course, options, profile } = props;

    return (
        <Grid container component="article" direction="column" spacing={1}>
            <Grid item component="header">
                <Typography variant="h2">{course.title}</Typography>
            </Grid>
            {options.showAttribution && (
                <Grid item container direction="column">
                    <Grid item>
                        <Typography variant="overline" component="p">
                            <Link href={`/profile/${course.creatorId}`}>
                                {course.creatorName}
                            </Link>
                        </Typography>
                        <Typography variant="overline">
                            {formattedLocaleDate(course.updatedAt)}
                        </Typography>
                    </Grid>
                </Grid>
            )}
            {course.featuredImage && (
                <Grid item>
                    <Image
                        alt={course.featuredImage.caption}
                        src={course.featuredImage.file!}
                        loading="eager"
                        sizes="80vw"
                        height={360}
                    />
                </Grid>
            )}
            {options.showEnrollmentArea &&
                (profile.fetched
                    ? !isEnrolled(course.courseId, profile) &&
                      checkPermission(profile.permissions, [
                          permissions.enrollInCourse,
                      ])
                    : true) && (
                    <Grid item>
                        <p>{profile.fetched}</p>
                        <Grid
                            container
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Grid item>
                                <PriceTag
                                    cost={course.cost}
                                    freeCostCaption={FREE_COST}
                                    currencyISOCode={
                                        props.siteInfo.currencyISOCode as string
                                    }
                                />
                            </Grid>
                            <Grid>
                                <Link
                                    href={`/checkout/${course.courseId}`}
                                    sxProps={{
                                        textDecoration: "none",
                                    }}
                                >
                                    <Button variant="contained" size="large">
                                        {ENROLL_BUTTON_TEXT}
                                    </Button>
                                </Link>
                            </Grid>
                        </Grid>
                    </Grid>
                )}
            <Grid
                item
                sx={{
                    overflow: "hidden",
                }}
            >
                <TextRenderer
                    json={
                        course.description
                            ? JSON.parse(course.description)
                            : { type: "doc" }
                    }
                />
            </Grid>
            {course.tags.length > 0 && (
                <Grid item container alignItems="center" spacing={1}>
                    <Grid item>
                        <Typography variant="h6">Tags </Typography>
                    </Grid>
                    <Grid item>
                        {course.tags.map((tag: string) => (
                            <Link href={`/tag/${tag}`} key={tag}>
                                <Chip label={tag} component="a" clickable />
                            </Link>
                        ))}
                    </Grid>
                </Grid>
            )}
        </Grid>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Article);
