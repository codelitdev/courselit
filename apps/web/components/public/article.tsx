import React from "react";
import { formattedLocaleDate } from "../../ui-lib/utils";
import { connect } from "react-redux";
import {
    Image,
    Link,
    TextRenderer,
    TextEditorEmptyDoc,
} from "@courselit/components-library";
import { AppState } from "@courselit/state-management";
import { Course, Profile, SiteInfo } from "@courselit/common-models";
import { UIConstants as constants } from "@courselit/common-models";

const { permissions } = constants;

interface ArticleProps {
    course: Course;
    options?: ArticleOptionsProps;
    profile: Profile;
    siteInfo: SiteInfo;
}

interface ArticleOptionsProps {
    showAttribution?: boolean;
    hideTitle?: boolean;
}

const Article = (props: ArticleProps) => {
    const { course, options = { hideTitle: false } } = props;

    return (
        <div className="flex flex-col">
            <header>
                {!options?.hideTitle && (
                    <h1 className="text-4xl font-semibold mb-8">
                        {course.title}
                    </h1>
                )}
                {options?.showAttribution && (
                    <div className="flex flex-col mb-8">
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
            <div className="overflow-hidden">
                <TextRenderer
                    json={
                        course.description
                            ? JSON.parse(course.description)
                            : TextEditorEmptyDoc
                    }
                    showTableOfContent={true}
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
