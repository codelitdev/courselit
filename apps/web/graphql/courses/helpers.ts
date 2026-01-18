import { internal, responses } from "../../config/strings";
import GQLContext from "../../models/GQLContext";
import constants from "../../config/constants";
import slugify from "slugify";
import { addGroup } from "./logic";
import { repositories, Criteria } from "@courselit/orm-models";
import { Constants, Course, Progress, User } from "@courselit/common-models";
import { getPlans } from "../paymentplans/logic";
import { InternalCourse } from "@courselit/common-logic";

export const validateCourse = async (
    courseData: InternalCourse,
    ctx: GQLContext,
) => {
    if (courseData.type === Constants.CourseType.BLOG) {
        if (!courseData.description) {
            throw new Error(responses.blog_description_empty);
        }

        if (courseData.lessons && courseData.lessons.length) {
            throw new Error(responses.cannot_convert_to_blog);
        }
    }

    // if (courseData.costType !== constants.costPaid) {
    //     courseData.cost = 0;
    // }

    // if (courseData.costType === constants.costPaid && courseData.cost < 0) {
    //     throw new Error(responses.invalid_cost);
    // }

    // if (
    //     courseData.type === constants.course &&
    //     courseData.costType === constants.costEmail
    // ) {
    //     throw new Error(responses.courses_cannot_be_downloaded);
    // }

    // if (courseData.costType === constants.costPaid && courseData.cost > 0) {
    //     await validatePaymentMethod(ctx.subdomain._id.toString());
    // }

    if (
        courseData.type === Constants.CourseType.COURSE ||
        courseData.type === Constants.CourseType.DOWNLOAD
    ) {
        if (courseData.published) {
            const existingPaymentPlans = await getPlans({
                entityId: courseData.courseId,
                entityType: Constants.MembershipEntityType.COURSE,
                ctx,
            });
            if (existingPaymentPlans.length === 0) {
                throw new Error(responses.payment_plan_required);
            }
        }

        if (
            courseData.type === Constants.CourseType.DOWNLOAD &&
            courseData.leadMagnet
        ) {
            const paymentPlans = await getPlans({
                entityId: courseData.courseId,
                entityType: Constants.MembershipEntityType.COURSE,
                ctx,
            });
            if (
                paymentPlans.length === 0 ||
                paymentPlans.length > 1 ||
                paymentPlans.some(
                    (plan) => plan.type !== Constants.PaymentPlanType.FREE,
                )
            ) {
                throw new Error(responses.lead_magnet_invalid_settings);
            }
        }
    }

    if (
        courseData.certificate &&
        courseData.type !== Constants.CourseType.COURSE
    ) {
        throw new Error(responses.certificate_invalid_settings);
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
    criteria,
    page,
    limit,
}: {
    criteria: Criteria<Course>;
    page?: number;
    limit?: number;
}): Promise<Course[]> => {
    const itemsPerPage = limit || constants.itemsPerPage;
    const offset = (page || constants.defaultOffset) - 1;

    criteria.orderBy("updatedAt", "desc");
    criteria.skip(offset * itemsPerPage);
    criteria.take(itemsPerPage);

    // We used aggregate before with project.
    // findMany returns full objects.
    return await repositories.course.findMany(criteria);
};

export const calculatePercentageCompletion = (user: User, course: Course) => {
    const purchasedCourse = user.purchases.filter(
        (item: Progress) => item.courseId === course.courseId,
    )[0];

    const totalLessons = course.lessons?.length ?? 0;
    if (!purchasedCourse.completedLessons.length || !totalLessons) {
        return 0;
    }

    return purchasedCourse.completedLessons.length / totalLessons;
};

export const setupCourse = async ({
    title,
    type,
    ctx,
}: {
    title: string;
    type: "course" | "download";
    ctx: GQLContext;
}) => {
    const page = await repositories.page.create({
        domain: ctx.subdomain.id,
        name: title,
        creatorId: ctx.user.userId,
        pageId: slugify(title.toLowerCase()),
    });

    const course = await repositories.course.create({
        domain: ctx.subdomain.id,
        title: title,
        cost: 0,
        costType: constants.costFree,
        privacy: constants.unlisted,
        creatorId: ctx.user.userId,
        slug: slugify(title.toLowerCase()),
        type: type,
        pageId: page.pageId,
        groups: [],
        published: false,
    });

    // addGroup uses repository now (if refactored), or logic.ts logic which we refactored.
    // addGroup(id, name, ...).
    await addGroup({
        id: course.courseId,
        name: internal.default_group_name,
        collapsed: false,
        ctx,
    });

    // Page updates
    page.entityId = course.courseId;
    page.layout = getInitialLayout(type) as any;
    await repositories.page.update((page as any).id, page);

    return course;
};

export const setupBlog = async ({
    title,
    ctx,
}: {
    title: string;
    ctx: GQLContext;
}) => {
    const course = await repositories.course.create({
        domain: ctx.subdomain.id,
        title: title,
        cost: 0,
        costType: constants.costFree,
        privacy: constants.unlisted,
        creatorId: ctx.user.userId,
        slug: slugify(title.toLowerCase()),
        type: constants.blog,
        groups: [],
        published: false,
        // Course interface requires these potentially?
        // common-models Course: groups?: Group[].
    });

    return course;
};

const getInitialLayout = (type: "course" | "download") => {
    const layout: Record<string, any>[] = [
        {
            name: "header",
            deleteable: false,
            shared: true,
        },
        {
            name: "banner",
        },
    ];
    if (type === Constants.CourseType.COURSE) {
        layout.push({
            name: "content",
            settings: {
                title: "Curriculum",
                headerAlignment: "center",
            },
        });
    }
    layout.push({
        name: "footer",
        deleteable: false,
        shared: true,
    });
    return layout;
};
