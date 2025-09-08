import { sortCourseGroups } from "@ui-lib/utils";
import { Course, Group, Lesson } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";

export type CourseFrontend = CourseWithoutGroups & {
    groups: GroupWithLessons[];
    firstLesson: string;
};

export type GroupWithLessons = Group & { lessons: Lesson[] };
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
    | "paymentPlans"
    | "defaultPaymentPlan"
>;

export const getProduct = async (
    id: string,
    address: string,
): Promise<CourseFrontend> => {
    const fetch = new FetchBuilder()
        .setUrl(`${address}/api/graph`)
        .setIsGraphQLEndpoint(true)
        .setPayload({
            query: `
                query ($id: String!) {
                    product: getCourse(id: $id) {
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
                        paymentPlans {
                            planId
                            name
                            type
                            oneTimeAmount
                            emiAmount
                            emiTotalInstallments
                            subscriptionMonthlyAmount
                            subscriptionYearlyAmount
                        }
                        leadMagnet
                        defaultPaymentPlan
                    }
                }
            `,
            variables: { id },
        })
        .setIsGraphQLEndpoint(true)
        .build();
    const response = await fetch.exec();
    return formatCourse(response.product);
};

export function formatCourse(
    post: Course & { lessons: Lesson[]; firstLesson: string; groups: Group[] },
): CourseFrontend {
    for (const group of sortCourseGroups(post as Course)) {
        (group as GroupWithLessons).lessons = post.lessons
            .filter((lesson: Lesson) => lesson.groupId === group.id)
            .sort(
                (a: any, b: any) =>
                    group.lessonsOrder?.indexOf(a.lessonId) -
                    group.lessonsOrder?.indexOf(b.lessonId),
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
        paymentPlans: post.paymentPlans,
        defaultPaymentPlan: post.defaultPaymentPlan,
    };
}
