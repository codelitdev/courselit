import { getPaymentMethod } from "../../payments";
import { responses } from "../../config/strings";
import GQLContext from "../../models/GQLContext";
import CourseModel, { Course } from "../../models/Course";
import { checkMediaForPublicAccess } from "../media/logic";
import constants from "../../config/constants";
import { Progress } from "../../models/Progress";
import { User } from "../../models/User";

const validatePaymentMethod = async (domain: string) => {
    try {
        await getPaymentMethod(domain);
    } catch (err: any) {
        if (err.message === responses.update_payment_method) {
            throw err;
        } else {
            throw new Error(responses.internal_error);
        }
    }
};

export const validateCourse = async (courseData: Course, ctx: GQLContext) => {
    if (courseData.isBlog) {
        if (!courseData.description) {
            throw new Error(responses.blog_description_empty);
        }

        if (courseData.lessons && courseData.lessons.length) {
            throw new Error(responses.cannot_convert_to_blog);
        }

        courseData.cost = 0;
    }

    if (courseData.featuredImage) {
        const featuredImageHasPublicAccess = await checkMediaForPublicAccess(
            courseData.featuredImage
        );
        if (!featuredImageHasPublicAccess) {
            throw new Error(responses.publicly_inaccessible);
        }
    }

    if (courseData.cost < 0) {
        throw new Error(responses.invalid_cost);
    }

    if (courseData.cost > 0) {
        await validatePaymentMethod(ctx.subdomain._id);
    }

    return courseData;
};

// exports.validateCost = async (courseData, domain) => {
//   if (courseData.cost < 0) {
//     throw new Error(responses.invalid_cost);
//   }

//   if (courseData.cost > 0) {
//     await validatePaymentMethod(domain);
//   }

//   return courseData;
// };

export const getPaginatedCoursesForAdmin = async ({
    query,
    page,
    limit,
}: {
    query: Record<string, unknown>;
    page?: number;
    limit?: number;
}): Promise<Course[]> => {
    const itemsPerPage = limit || constants.itemsPerPage;
    const offset = (page || constants.defaultOffset) - 1;
    return CourseModel.aggregate([
        { $match: query },
        { $sort: { updatedAt: -1 } },
        { $skip: offset * itemsPerPage },
        { $limit: itemsPerPage },
        {
            $project: {
                id: "$_id",
                title: 1,
                slug: 1,
                featuredImage: 1,
                isBlog: 1,
                courseId: 1,
                type: 1,
                published: 1,
                sales: 1,
                customers: {
                    $cond: {
                        if: { $isArray: "$customers" },
                        then: { $size: "$customers" },
                        else: 0,
                    },
                },
                pageId: 1,
            },
        },
    ]);
};

export const calculatePercentageCompletion = (user: User, course: Course) => {
    const purchasedCourse = user.purchases.filter(
        (item: Progress) => item.courseId === course.courseId
    )[0];
    return purchasedCourse.completedLessons.length / course.lessons.length;
};
