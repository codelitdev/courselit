import { useRouter } from "next/router";
import RouteBasedComponentScaffold from "../../../../components/public/scaffold";
import LessonViewer from "../../../../components/public/lesson-viewer";
import { getServerSideProps, generateSideBarItems, CourseFrontend } from ".";
import type { Address, Lesson, Profile } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { useEffect, useState } from "react";
import { FetchBuilder } from "@courselit/utils";
import { sortCourseGroups } from "@ui-lib/utils";

interface LessonProps {
    course: CourseFrontend;
    profile: Profile;
    address: Address;
}

const Lesson = (props: LessonProps) => {
    const { profile, address } = props;
    const [course, setCourse] = useState<CourseFrontend | null>(props.course);
    const router = useRouter();
    const { lesson } = router.query;

    useEffect(() => {
        if (profile.fetched) {
            loadCourse();
        }
    }, [profile]);

    const loadCourse = async () => {
        const graphQuery = `
            query {
                post: getCourse(id: "${props.course.courseId}") {
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
                        rank,
                        lessonsOrder
                    },
                    lessons {
                        lessonId,
                        title,
                        requiresEnrollment,
                        courseId,
                        groupId,
                    },
                    tags,
                    firstLesson
                }
            }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload(graphQuery)
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            const { post } = response;
            if (post) {
                const lessonsOrderedByGroups: Record<string, unknown> = {};
                for (const group of sortCourseGroups(post)) {
                    lessonsOrderedByGroups[group.name] = post.lessons
                        .filter((lesson: Lesson) => lesson.groupId === group.id)
                        .sort(
                            (a: any, b: any) =>
                                group.lessonsOrder.indexOf(a.lessonId) -
                                group.lessonsOrder.indexOf(b.lessonId),
                        );
                }

                const courseGroupedByLessons: CourseFrontend = {
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

                setCourse(courseGroupedByLessons);
            }
        } catch (err: any) {}
    };

    if (!router.isReady) {
        return <></>;
    }

    return (
        <RouteBasedComponentScaffold
            items={generateSideBarItems(course, profile)}
        >
            {lesson && (
                <LessonViewer lessonId={lesson as string} slug={course.slug} />
            )}
            {/* <div className="h-full bg-red-100 relative">
                <div className="bg-red-200 h-[1000px]"></div>
                <div className="fixed bottom-0 bg-yellow-100 h-20 w-full"></div>
            </div> */}
        </RouteBasedComponentScaffold>
    );
};

const mapStateToProps = (state: AppState) => ({
    profile: state.profile,
    siteInfo: state.siteinfo,
    address: state.address,
});

export default connect(mapStateToProps)(Lesson);

export { getServerSideProps };
