import React from "react";
import { formattedLocaleDate, isEnrolled } from "../../ui-lib/utils";
import { connect } from "react-redux";
import {
    PriceTag,
    Image,
    Link,
    TextRenderer,
    TextEditorEmptyDoc,
} from "@courselit/components-library";
import { ENROLL_BUTTON_TEXT, FREE_COST } from "../../ui-config/strings";
import { AppState } from "@courselit/state-management";
import { Course, Profile, SiteInfo } from "@courselit/common-models";
import { UIConstants as constants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { Button } from "@courselit/components-library";

const { permissions } = constants;

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
        <div className="flex flex-col">
            <header>
                <h1 className="text-4xl font-semibold mb-4">{course.title}</h1>
                {options.showAttribution && (
                    <div className="flex flex-col mb-4">
                        <Link href={`/profile/${course.creatorId}`}>
                            <p className="font-medium">{course.creatorName}</p>
                        </Link>
                        <p className="font-light text-sm">
                            {formattedLocaleDate(course.updatedAt, "long")}
                        </p>
                    </div>
                )}
            </header>
            {course.featuredImage && (
                <div className="flex justify-center">
                    <div className="mt-4 mb-8 w-full md:max-w-screen-md">
                        <Image
                            alt={course.featuredImage.caption}
                            src={course.featuredImage.file!}
                            loading="eager"
                            sizes="50vw"
                        />
                    </div>
                </div>
            )}
            {options.showEnrollmentArea &&
                (profile.fetched
                    ? !isEnrolled(course.courseId, profile) &&
                      checkPermission(profile.permissions, [
                          permissions.enrollInCourse,
                      ])
                    : true) && (
                    <div>
                        <p>{profile.fetched}</p>
                        <div className="flex justify-between items-center">
                            <PriceTag
                                cost={course.cost}
                                freeCostCaption={FREE_COST}
                                currencyISOCode={
                                    props.siteInfo.currencyISOCode as string
                                }
                            />
                            <Link
                                href={`/checkout/${course.courseId}`}
                                sxProps={{
                                    textDecoration: "none",
                                }}
                            >
                                <Button component="button">
                                    {ENROLL_BUTTON_TEXT}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            <div className="overflow-hidden">
                <TextRenderer
                    json={
                        course.description
                            ? JSON.parse(course.description)
                            : TextEditorEmptyDoc
                    }
                />
            </div>
            {/*
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
            */}
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Article);
