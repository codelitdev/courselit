import { connect } from "react-redux";
import Head from "next/head";
import {
    formulateCourseUrl,
    getBackendAddress,
    getPostDescriptionSnippet,
} from "../../../ui-lib/utils";
import { Lock } from "@mui/icons-material";
import { SIDEBAR_TEXT_COURSE_ABOUT } from "../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import dynamic from "next/dynamic";
import type { AppState } from "@courselit/state-management";
import { Address, Lesson, Profile, SiteInfo } from "@courselit/common-models";
import ComponentScaffold from "../../../components/public/base-layout/component-scaffold";

const CourseIntroduction = dynamic(
    () => import("../../../components/course-introduction")
);
const LessonViewer = dynamic(
    () => import("../../../components/public/lesson-viewer")
);
const AppError = dynamic(() => import("../../../components/app-error"));

interface CourseProps {
    course: any;
    profile: Profile;
    siteInfo: SiteInfo;
    address: Address;
    error: string;
}

const Course = (props: CourseProps) => {
    const { course, profile, error } = props;
    const lessons = [];
    let key = 0;

    if (course) {
        lessons.push({
            name: SIDEBAR_TEXT_COURSE_ABOUT,
            element: <CourseIntroduction key={key++} course={course} />,
        });
        for (const group of Object.keys(course.groupOfLessons)) {
            lessons.push({
                name: group,
                element: null,
            });
            for (const lesson of course.groupOfLessons[group]) {
                lessons.push({
                    name: lesson.title,
                    element: <LessonViewer key={key++} lesson={lesson} />,
                    icon:
                        lesson.requiresEnrollment &&
                        !profile.purchases.includes(course.id) ? (
                            <Lock />
                        ) : null,
                    iconPlacementRight: true,
                });
            }
        }
    }

    return (
        <>
            {error && <AppError error={error} />}
            {!error && (
                <>
                    <Head>
                        <title>
                            {course.title} | {props.siteInfo.title}
                        </title>
                        <meta
                            name="viewport"
                            content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no"
                        />
                        <meta
                            property="og:url"
                            content={formulateCourseUrl(
                                course,
                                props.address.frontend
                            )}
                        />
                        <meta property="og:type" content="article" />
                        <meta property="og:title" content={course.title} />
                        <meta
                            property="og:description"
                            content={getPostDescriptionSnippet(
                                course.description
                            )}
                        />
                        <meta
                            property="og:author"
                            content={course.creatorName}
                        />
                        {course.featuredImage && (
                            <meta
                                property="og:image"
                                content={
                                    course.featuredImage &&
                                    course.featuredImage.file
                                }
                            />
                        )}
                    </Head>
                    <ComponentScaffold items={lessons} />
                </>
            )}
        </>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const graphQuery = `
    query {
      post: getCourse(courseId: "${query.id}") {
        id,
        title,
        description,
        featuredImage {
          file,
          caption
        },
        updatedAt,
        creatorName,
        creatorId,
        slug,
        isBlog,
        cost,
        courseId,
        groups {
          id,
          name,
          rank
        },
        lessons {
          id,
          title,
          requiresEnrollment,
          courseId,
          groupId,
          groupRank
        },
        tags
      }
    }
  `;
    const fetch = new FetchBuilder()
        .setUrl(`${getBackendAddress(req.headers.host)}/api/graph`)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        const { post } = response;
        if (post) {
            const lessonsOrderedByGroups: Record<string, unknown> = {};
            for (const group of response.post.groups) {
                lessonsOrderedByGroups[group.name] =
                    response.post.lessons.filter(
                        (lesson: Lesson) => lesson.groupId === group.id
                    );
            }

            const courseGroupedByLessons = {
                id: post.id,
                title: post.title,
                description: post.description,
                featuredImage: post.featuredImage,
                updatedAt: post.updatedAt,
                creatorName: post.creatorName,
                creatorId: post.creatorId,
                slug: post.slug,
                isBlog: post.isBlog,
                cost: post.cost,
                courseId: post.courseId,
                groupOfLessons: lessonsOrderedByGroups,
                tags: post.tags,
            };
            return {
                props: {
                    course: courseGroupedByLessons,
                    error: null,
                },
            };
        } else {
            return {
                props: {
                    course: null,
                    error: "Invalid response",
                },
            };
        }
    } catch (err: any) {
        return {
            props: {
                course: null,
                error: err.message,
            },
        };
    }
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Course);
