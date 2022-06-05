import { getPaymentMethod } from "../../payments";
import { responses } from "../../config/strings";
import GQLContext from "../../models/GQLContext";
import { Course } from "../../models/Course";
import { checkMediaForPublicAccess } from "../media/logic";

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

export const validateBlogPosts = async (
    courseData: Course,
    ctx: GQLContext
) => {
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
