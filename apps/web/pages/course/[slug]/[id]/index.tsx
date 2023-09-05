import { connect } from "react-redux";
import Head from "next/head";
import {
    formulateCourseUrl,
    getBackendAddress,
    isEnrolled,
    isLessonCompleted,
} from "../../../../ui-lib/utils";
import { ArrowRight, CheckCircled, Circle, Lock } from "@courselit/icons";
import {
    COURSE_PROGRESS_START,
    SIDEBAR_TEXT_COURSE_ABOUT,
} from "../../../../ui-config/strings";
import { FetchBuilder } from "@courselit/utils";
import type { AppState } from "@courselit/state-management";
import {
    Address,
    Course,
    Lesson,
    Profile,
    SiteInfo,
} from "@courselit/common-models";
import RouteBasedComponentScaffold, {
    ComponentScaffoldMenuItem,
} from "@components/public/scaffold";
import Article from "@components/public/article";
import { Link, Button } from "@courselit/components-library";

interface CourseProps {
    course: any;
    profile: Profile;
    siteInfo: SiteInfo;
    address: Address;
    error: string;
}

export function generateSideBarItems(
    course: Course & { groupOfLessons: string[] },
    profile: Profile,
): ComponentScaffoldMenuItem[] {
    if (!course) return [];

    const lessons: ComponentScaffoldMenuItem[] = [
        {
            label: SIDEBAR_TEXT_COURSE_ABOUT,
            href: `/course/${course.slug}/${course.courseId}`,
        },
    ];
    for (const group of Object.keys(course.groupOfLessons as string[])) {
        lessons.push({
            label: group,
            icon: undefined,
        });
        for (const lesson of course.groupOfLessons[group]) {
            lessons.push({
                label: lesson.title,
                href: `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`,
                icon:
                    lesson.requiresEnrollment &&
                    !isEnrolled(course.courseId, profile) ? (
                        <Lock />
                    ) : profile.userId ? (
                        isLessonCompleted({
                            courseId: course.courseId,
                            lessonId: lesson.lessonId,
                            profile,
                        }) ? (
                            <CheckCircled />
                        ) : (
                            <Circle />
                        )
                    ) : undefined,
                iconPlacementRight: true,
            });
        }
    }

    return lessons;
}

const CourseViewer = (props: CourseProps) => {
    const { course, profile } = props;
    let key = 0;

    return (
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
                    content={formulateCourseUrl(course, props.address.frontend)}
                />
                <meta property="og:type" content="article" />
                <meta property="og:title" content={course.title} />
                {/* <meta
                    property="og:description"
                    content={getPostDescriptionSnippet(course.description)}
                /> */}
                <meta property="og:author" content={course.creatorName} />
                {course.featuredImage && (
                    <meta
                        property="og:image"
                        content={
                            course.featuredImage && course.featuredImage.file
                        }
                    />
                )}
            </Head>
            <RouteBasedComponentScaffold
                items={generateSideBarItems(course, profile)}
            >
                <div className="flex flex-col">
                    <Article
                        course={course}
                        options={{ showEnrollmentArea: true }}
                    />
                    {isEnrolled(course.courseId, profile) && (
                        <div className="self-end">
                            <Link
                                href={`/course/${course.slug}/${course.courseId}/${course.firstLesson}`}
                            >
                                <Button component="button">
                                    {COURSE_PROGRESS_START}
                                    <ArrowRight />
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            </RouteBasedComponentScaffold>
        </>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const graphQuery = `
    query {
      post: getCourse(id: "${query.id}") {
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
        cost,
        courseId,
        groups {
          id,
          name,
          rank
        },
        lessons {
          lessonId,
          title,
          requiresEnrollment,
          courseId,
          groupId,
          groupRank
        },
        tags,
        firstLesson
      }
    }
  `;
    const fetch = new FetchBuilder()
        .setUrl(`${getBackendAddress(req.headers)}/api/graph`)
        .setPayload(graphQuery)
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        const { post } = response;
        if (post) {
            const lessonsOrderedByGroups: Record<string, unknown> = {};
            for (const group of post.groups) {
                lessonsOrderedByGroups[group.name] = post.lessons.filter(
                    (lesson: Lesson) => lesson.groupId === group.id,
                );
            }

            const courseGroupedByLessons = {
                title: post.title,
                description: post.description,
                featuredImage: post.featuredImage,
                updatedAt: post.updatedAt,
                creatorName: post.creatorName,
                creatorId: post.creatorId,
                slug: post.slug,
                cost: post.cost,
                courseId: post.courseId,
                groupOfLessons: lessonsOrderedByGroups,
                tags: post.tags,
                firstLesson: post.firstLesson,
            };
            return {
                props: {
                    course: courseGroupedByLessons,
                },
            };
        } else {
            return {
                notFound: true,
            };
        }
    } catch (err: any) {
        return {
            notFound: true,
        };
    }
}

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(CourseViewer);
