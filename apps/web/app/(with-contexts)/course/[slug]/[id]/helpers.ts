import { Course, Group, Lesson } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import { responses } from "@/config/strings";

export type CourseFrontend = CourseWithoutGroups & {
    groups: GroupWithLessons[];
    firstLesson: string;
    isManager: boolean;
};

export type GroupWithLessons = Group & { lessons: Lesson[] };
type CourseWithoutGroups = Pick<
    Course,
    | "title"
    | "description"
    | "featuredImage"
    | "updatedAt"
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
    requestHeaders?: Record<string, string>,
): Promise<CourseFrontend> => {
    const fetchBuilder = new FetchBuilder()
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
                        creatorId,
                        slug,
                        cost,
                        courseId,
                        isManager,
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
        .setIsGraphQLEndpoint(true);

    if (requestHeaders) {
        fetchBuilder.setHeaders(requestHeaders);
    }

    const fetch = fetchBuilder.build();
    const response = await fetch.exec();
    return formatCourse(response.product);
};

export function formatCourse(
    post:
        | (Course & {
              lessons: Lesson[];
              firstLesson: string;
              groups: Group[];
          })
        | null,
): CourseFrontend {
    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const groupsWithLessons = post.groups.map((group) => ({
        ...group,
        lessons: post.lessons
            .filter((lesson: Lesson) => lesson.groupId === group.id)
            .sort(
                (a: any, b: any) =>
                    group.lessonsOrder?.indexOf(a.lessonId) -
                    group.lessonsOrder?.indexOf(b.lessonId),
            ),
    }));

    return {
        title: post.title,
        description: post.description,
        featuredImage: post.featuredImage,
        updatedAt: post.updatedAt,
        creatorId: post.creatorId,
        slug: post.slug,
        cost: post.cost,
        courseId: post.courseId,
        isManager: Boolean(
            (post as Course & { isManager?: boolean }).isManager,
        ),
        groups: groupsWithLessons as GroupWithLessons[],
        tags: post.tags,
        firstLesson: post.firstLesson,
        paymentPlans: post.paymentPlans,
        defaultPaymentPlan: post.defaultPaymentPlan,
    };
}
