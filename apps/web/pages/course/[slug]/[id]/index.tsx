import { connect } from "react-redux";
import Head from "next/head";
import {
    getBackendAddress,
    isEnrolled,
    isLessonCompleted,
    sortCourseGroups,
} from "../../../../ui-lib/utils";
import { ArrowRight, CheckCircled, Circle, Lock } from "@courselit/icons";
import {
    COURSE_PROGRESS_START,
    ENROLL_BUTTON_TEXT,
    FREE_COST,
    SIDEBAR_TEXT_COURSE_ABOUT,
} from "../../../../ui-config/strings";
import { FetchBuilder, checkPermission } from "@courselit/utils";
import {
    AppState,
    AppDispatch,
    actionCreators,
} from "@courselit/state-management";
import {
    Address,
    Course,
    Group,
    Lesson,
    Profile,
    SiteInfo,
    Constants,
    UIConstants,
} from "@courselit/common-models";
import RouteBasedComponentScaffold, {
    ComponentScaffoldMenuItem,
    Divider,
} from "@components/public/scaffold";
import Article from "@components/public/article";
import { Link, Button2, PriceTag } from "@courselit/components-library";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
const { permissions } = UIConstants;

type GroupWithLessons = Group & { lessons: Lesson[] };
type CourseWithoutGroups = Pick<
    Course,
    | "title"
    | "description"
    | "featuredImage"
    | "updatedAt"
    | "creatorName"
    | "creatorId"
    | "slug"
    | "cost"
    | "courseId"
    | "tags"
>;

export type CourseFrontend = CourseWithoutGroups & {
    groups: GroupWithLessons[];
    firstLesson: string;
};

interface CourseProps {
    course: CourseFrontend;
    profile: Profile;
    siteInfo: SiteInfo;
    address: Address;
    error: string;
    dispatch: AppDispatch;
}

export const graphQuery = `
    query ($id: String!) {
      post: getCourse(id: $id) {
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
          lessonsOrder,
          drip {
            status,
            type,
            delayInMillis,
            dateInUTC
          }
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

export function isGroupAccessibleToUser(
    course: CourseFrontend,
    profile: Profile,
    group: GroupWithLessons,
): boolean {
    if (!group.drip || !group.drip.status) return true;

    if (!Array.isArray(profile.purchases)) return false;

    for (const purchase of profile.purchases) {
        if (purchase.courseId === course.courseId) {
            if (Array.isArray(purchase.accessibleGroups)) {
                if (purchase.accessibleGroups.includes(group.id)) {
                    return true;
                }
            }
        }
    }

    return false;
}

export function generateSideBarItems(
    course: CourseFrontend,
    profile: Profile,
): (ComponentScaffoldMenuItem | Divider)[] {
    if (!course) return [];

    const items: (ComponentScaffoldMenuItem | Divider)[] = [
        {
            label: SIDEBAR_TEXT_COURSE_ABOUT,
            href: `/course/${course.slug}/${course.courseId}`,
        },
    ];

    let lastGroupDripDateInMillis = Date.now();

    for (const group of course.groups) {
        let availableLabel = "";
        if (group.drip && group.drip.status) {
            if (
                group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase()
            ) {
                const delayInMillis =
                    group.drip.delayInMillis + lastGroupDripDateInMillis;
                const daysUntilAvailable = Math.ceil(
                    (delayInMillis - Date.now()) / 86400000,
                );
                availableLabel =
                    daysUntilAvailable &&
                    !isGroupAccessibleToUser(course, profile, group)
                        ? isEnrolled(course.courseId, profile)
                            ? `Available in ${daysUntilAvailable} days`
                            : `Available ${daysUntilAvailable} days after enrollment`
                        : "";
            } else {
                const today = new Date();
                const dripDate = new Date(group.drip.dateInUTC);
                const timeDiff = dripDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                availableLabel =
                    daysDiff > 0 &&
                    !isGroupAccessibleToUser(course, profile, group)
                        ? `Available in ${daysDiff} days`
                        : "";
            }
        }

        // Update lastGroupDripDateInMillis for relative drip types
        if (
            group.drip &&
            group.drip.status &&
            group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase()
        ) {
            lastGroupDripDateInMillis += group.drip.delayInMillis;
        }

        items.push({
            badge: availableLabel,
            label: group.name,
        });

        // const lessonItems = []
        for (const lesson of group.lessons) {
            items.push({
                label: lesson.title,
                href: `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`,
                icon:
                    profile && profile.userId ? (
                        isEnrolled(course.courseId, profile) ? (
                            isLessonCompleted({
                                courseId: course.courseId,
                                lessonId: lesson.lessonId,
                                profile,
                            }) ? (
                                <CheckCircled />
                            ) : (
                                <Circle />
                            )
                        ) : lesson.requiresEnrollment ? (
                            <Lock />
                        ) : undefined
                    ) : lesson.requiresEnrollment ? (
                        <Lock />
                    ) : undefined,
                iconPlacementRight: true,
            });
        }
    }

    return items;
}

const CourseViewer = (props: CourseProps) => {
    const { status } = useSession();
    const { profile, dispatch, address } = props;
    const [course, setCourse] = useState<CourseFrontend | null>(props.course);

    useEffect(() => {
        if (status === "authenticated") {
            dispatch(actionCreators.signedIn());
            dispatch(actionCreators.authChecked());
        }
        if (status === "unauthenticated") {
            dispatch(actionCreators.authChecked());
        }
    }, [status]);

    useEffect(() => {
        if (profile.fetched) {
            loadCourse();
        }
    }, [profile]);

    const loadCourse = async () => {
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: graphQuery,
                variables: { id: props.course.courseId },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            const { post } = response;
            if (post) {
                setCourse(formatCourse(post));
            }
        } catch (err: any) {}
    };

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
                <meta property="og:title" content={course.title} />
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
                drawerWidth={360}
                showCourseLitBranding={true}
            >
                <div className="flex flex-col pb-[100px] lg:max-w-[40rem] xl:max-w-[48rem] mx-auto">
                    <h1 className="text-4xl font-semibold mb-8">
                        {course.title}
                    </h1>
                    {(profile.fetched
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
                                <Link href={`/checkout/${course.courseId}`}>
                                    <Button2>{ENROLL_BUTTON_TEXT}</Button2>
                                </Link>
                            </div>
                        </div>
                    )}
                    <Article
                        course={course as unknown as Course}
                        options={{ hideTitle: true }}
                    />
                    {isEnrolled(course.courseId, profile) && (
                        <div className="self-end">
                            <Link
                                href={`/course/${course.slug}/${course.courseId}/${course.firstLesson}`}
                            >
                                <Button2 className="flex gap-1 items-center">
                                    {COURSE_PROGRESS_START}
                                    <ArrowRight />
                                </Button2>
                            </Link>
                        </div>
                    )}
                </div>
            </RouteBasedComponentScaffold>
        </>
    );
};

export async function getServerSideProps({ query, req }: any) {
    const fetch = new FetchBuilder()
        .setUrl(`${getBackendAddress(req.headers)}/api/graph`)
        .setPayload({ query: graphQuery, variables: { id: query.id } })
        .setIsGraphQLEndpoint(true)
        .build();

    try {
        const response = await fetch.exec();
        const { post } = response;
        if (post) {
            return {
                props: {
                    course: formatCourse(post),
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

export function formatCourse(
    post: Course & { lessons: Lesson[]; firstLesson: string; groups: Group[] },
): CourseFrontend {
    for (const group of sortCourseGroups(post as Course)) {
        (group as GroupWithLessons).lessons = post.lessons
            .filter((lesson: Lesson) => lesson.groupId === group.id)
            .sort(
                (a: any, b: any) =>
                    group.lessonsOrder.indexOf(a.lessonId) -
                    group.lessonsOrder.indexOf(b.lessonId),
            );
    }

    return {
        title: post.title,
        description: post.description,
        featuredImage: post.featuredImage,
        updatedAt: post.updatedAt,
        creatorName: post.creatorName,
        creatorId: post.creatorId,
        slug: post.slug,
        cost: post.cost,
        courseId: post.courseId,
        groups: post.groups as GroupWithLessons[],
        tags: post.tags,
        firstLesson: post.firstLesson,
    };
}

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });
export default connect(mapStateToProps, mapDispatchToProps)(CourseViewer);
