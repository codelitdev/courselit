/**
 * Business logic for managing courses.
 */
import CourseModel, { InternalCourse } from "../../models/Course";
import UserModel, { User } from "../../models/User";
import { responses } from "../../config/strings";
import {
    checkIfAuthenticated,
    validateOffset,
    checkOwnershipWithoutModel,
} from "../../lib/graphql";
import constants from "../../config/constants";
import {
    getPaginatedCoursesForAdmin,
    setupBlog,
    setupCourse,
    validateCourse,
} from "./helpers";
import Lesson from "../../models/Lesson";
import GQLContext from "../../models/GQLContext";
import Filter from "./models/filter";
import mongoose from "mongoose";
import {
    Constants,
    Group,
    Membership,
    MembershipStatus,
    Progress,
} from "@courselit/common-models";
import { deleteAllLessons } from "../lessons/logic";
import { deleteMedia } from "../../services/medialit";
import PageModel from "../../models/Page";
import { getPrevNextCursor } from "../lessons/helpers";
import { checkPermission } from "@courselit/utils";
import { error } from "../../services/logger";
import { getPlans } from "../paymentplans/logic";
import MembershipModel from "@models/Membership";
import { getActivities } from "../activities/logic";
import { ActivityType } from "@courselit/common-models/dist/constants";

const { open, itemsPerPage, blogPostSnippetLength, permissions } = constants;

export const getCourseOrThrow = async (
    id: mongoose.Types.ObjectId | undefined,
    ctx: GQLContext,
    courseId?: string,
): Promise<InternalCourse> => {
    checkIfAuthenticated(ctx);

    const query = courseId
        ? {
              courseId,
          }
        : {
              _id: id,
          };

    const course = await CourseModel.findOne({
        ...query,
        domain: ctx.subdomain._id,
    });

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (!checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])) {
        if (!checkOwnershipWithoutModel(course, ctx)) {
            throw new Error(responses.item_not_found);
        } else {
            if (
                !checkPermission(ctx.user.permissions, [
                    permissions.manageCourse,
                ])
            ) {
                throw new Error(responses.action_not_allowed);
            }
        }
    }

    return course;
};

async function formatCourse(courseId: string, ctx: GQLContext) {
    const course: InternalCourse | null = await CourseModel.findOne({
        courseId,
        domain: ctx.subdomain._id,
    }).lean();

    const paymentPlans = await getPlans({
        planIds: course!.paymentPlans,
        ctx,
    });

    if (
        [Constants.CourseType.COURSE, Constants.CourseType.DOWNLOAD].includes(
            course.type,
        )
    ) {
        const { nextLesson } = await getPrevNextCursor(
            course.courseId,
            ctx.subdomain._id,
        );
        (course as any).firstLesson = nextLesson;
    }

    const result = {
        ...course,
        groups: course!.groups?.map((group: any) => ({
            ...group,
            id: group._id.toString(),
        })),
        paymentPlans,
    };
    return result;
}

export const getCourse = async (
    id: string,
    ctx: GQLContext,
    asGuest: boolean = false,
) => {
    const course: InternalCourse | null = await CourseModel.findOne({
        courseId: id,
        domain: ctx.subdomain._id,
    }).lean();

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (ctx.user && !asGuest) {
        const isOwner =
            checkPermission(ctx.user.permissions, [
                permissions.manageAnyCourse,
            ]) || checkOwnershipWithoutModel(course, ctx);

        if (isOwner) {
            return await formatCourse(course.courseId, ctx);
        }
    }

    if (course.published) {
        // if (
        //     [constants.course, constants.download].includes(
        //         course.type as
        //             | typeof constants.course
        //             | typeof constants.download,
        //     )
        // ) {
        //     const { nextLesson } = await getPrevNextCursor(
        //         course.courseId,
        //         ctx.subdomain._id,
        //     );
        //     (course as any).firstLesson = nextLesson;
        // }
        // course.groups = accessibleGroups;
        return await formatCourse(course.courseId, ctx);
    } else {
        return null;
    }
};

export const createCourse = async (
    courseData: { title: string; type: Filter },
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageCourse])) {
        throw new Error(responses.action_not_allowed);
    }

    if (courseData.type === "blog") {
        return await setupBlog({
            title: courseData.title,
            ctx,
        });
    } else {
        return await setupCourse({
            title: courseData.title,
            type: courseData.type,
            ctx,
        });
    }
};

export const updateCourse = async (
    courseData: Partial<InternalCourse & { id: string }>,
    ctx: GQLContext,
) => {
    let course = await getCourseOrThrow(undefined, ctx, courseData.id);

    for (const key of Object.keys(courseData)) {
        if (key === "id") {
            continue;
        }

        if (
            key === "published" &&
            !checkPermission(ctx.user.permissions, [permissions.publishCourse])
        ) {
            throw new Error(responses.action_not_allowed);
        }

        if (key === "published" && !ctx.user.name) {
            throw new Error(responses.profile_incomplete);
        }

        course[key] = courseData[key];
    }

    course = await validateCourse(course, ctx);
    course = await (course as any).save();
    await PageModel.updateOne(
        { entityId: course.courseId, domain: ctx.subdomain._id },
        { $set: { name: course.title } },
    );
    return await formatCourse(course.courseId, ctx);
};

export const deleteCourse = async (id: string, ctx: GQLContext) => {
    const course = await getCourseOrThrow(undefined, ctx, id);
    await deleteAllLessons(course.courseId, ctx);
    if (course.featuredImage) {
        try {
            await deleteMedia(course.featuredImage.mediaId);
        } catch (err) {
            error(err.message, {
                stack: err.stack,
            });
        }
    }
    await PageModel.deleteOne({
        entityId: course.courseId,
        domain: ctx.subdomain._id,
    });
    await CourseModel.deleteOne({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });
    return true;
};

export const getCoursesAsAdmin = async ({
    offset,
    context,
    searchText,
    filterBy,
}: {
    offset: number;
    context: GQLContext;
    searchText?: string;
    filterBy?: Filter[];
}) => {
    checkIfAuthenticated(context);
    validateOffset(offset);
    const user = context.user;

    if (
        !checkPermission(user.permissions, [
            permissions.manageCourse,
            permissions.manageAnyCourse,
        ])
    ) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Partial<Omit<InternalCourse, "type">> & {
        $text?: Record<string, unknown>;
        type?: string | { $in: string[] };
    } = {
        domain: context.subdomain._id,
    };
    if (!checkPermission(user.permissions, [permissions.manageAnyCourse])) {
        query.creatorId = `${user.userId || user.id}`;
    }

    if (filterBy) {
        query.type = { $in: filterBy };
    } else {
        query.type = { $in: [constants.download, constants.course] };
    }

    if (searchText) query.$text = { $search: searchText };

    const courses = await getPaginatedCoursesForAdmin({
        query,
        page: offset,
    });

    return courses.map(async (course) => ({
        ...course,
        customers: await (MembershipModel as any).countDocuments({
            entityId: course.courseId,
            entityType: Constants.MembershipEntityType.COURSE,
            domain: context.subdomain._id,
        }),
        sales: (
            await getActivities({
                entityId: course.courseId,
                type: ActivityType.PURCHASED,
                duration: "lifetime",
                ctx: context,
            })
        ).count,
    }));
};

export const getCourses = async ({
    offset,
    ctx,
    tag,
    filterBy,
    ids,
}: {
    ctx: GQLContext;
    offset?: number;
    ids?: string[];
    tag?: string;
    filterBy?: Filter[];
}) => {
    const query: Record<string, unknown> = {
        published: true,
        privacy: Constants.ProductAccessType.PUBLIC,
        domain: ctx.subdomain._id,
    };

    let courses;
    if (ids) {
        query.courseId = {
            $in: ids,
        };
        courses = await CourseModel.find(query, {
            id: 1,
            title: 1,
            cost: 1,
            description: 1,
            type: 1,
            creatorName: 1,
            updatedAt: 1,
            slug: 1,
            featuredImage: 1,
            courseId: 1,
            tags: 1,
            groups: 1,
            pageId: 1,
        });
    } else {
        validateOffset(offset);
        if (tag) {
            query.tags = tag;
        }
        if (filterBy) {
            query.type = { $in: filterBy };
        }
        courses = await CourseModel.find(query, {
            id: 1,
            title: 1,
            cost: 1,
            description: 1,
            type: 1,
            creatorName: 1,
            updatedAt: 1,
            slug: 1,
            featuredImage: 1,
            courseId: 1,
            tags: 1,
            groups: 1,
            pageId: 1,
        })
            .sort({ updatedAt: -1 })
            .skip((offset! - 1) * itemsPerPage)
            .limit(itemsPerPage);
    }

    return courses.map((x) => ({
        id: x.id,
        title: x.title,
        cost: x.cost,
        description: x.description,
        type: x.type,
        creatorName: x.creatorName,
        updatedAt: x.updatedAt,
        slug: x.slug,
        featuredImage: x.featuredImage,
        courseId: x.courseId,
        tags: x.tags,
        groups: x.isBlog ? null : x.groups,
        pageId: x.isBlog ? undefined : x.pageId,
    }));
};

const getProductsQuery = (
    ctx: GQLContext,
    filter?: Filter[],
    tags?: string[],
    ids?: string[],
    publicView: boolean = false,
) => {
    const query: Partial<InternalCourse> = {
        domain: ctx.subdomain._id,
    };

    if (
        !publicView &&
        ctx.user &&
        checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        if (
            checkPermission(ctx.user.permissions, [permissions.manageAnyCourse])
        ) {
            // do nothing
        } else {
            query.creatorId = ctx.user.userId;
        }
    } else {
        query.published = true;
        query.privacy = Constants.ProductAccessType.PUBLIC;
    }

    if (filter) {
        query.type = { $in: filter };
    } else {
        query.type = { $in: [constants.download, constants.course] };
    }

    if (tags) {
        query.tags = { $in: tags };
    }

    if (ids) {
        query.courseId = {
            $in: ids,
        };
    }

    return query;
};

export const getProducts = async ({
    ctx,
    page = 1,
    limit = 10,
    filterBy,
    tags,
    ids,
    publicView,
    sort = -1,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
    filterBy?: Filter[];
    tags?: string[];
    ids?: string[];
    publicView?: boolean;
    sort?: number;
}): Promise<InternalCourse[]> => {
    const query = getProductsQuery(ctx, filterBy, tags, ids, publicView);

    const courses = await (CourseModel as any).paginatedFind(query, {
        page,
        limit,
        sort,
    });

    const hasManagePerm =
        ctx.user &&
        checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ]);

    const products: InternalCourse[] = [];

    for (const course of courses) {
        const customers =
            hasManagePerm && course.type !== constants.blog
                ? await (MembershipModel as any).countDocuments({
                      entityId: course.courseId,
                      entityType: Constants.MembershipEntityType.COURSE,
                      domain: ctx.subdomain._id,
                      status: Constants.MembershipStatus.ACTIVE,
                  })
                : undefined;
        const sales =
            hasManagePerm && course.type !== constants.blog
                ? (
                      await getActivities({
                          entityId: course.courseId,
                          type: ActivityType.PURCHASED,
                          duration: "lifetime",
                          ctx,
                      })
                  ).count
                : undefined;
        const paymentPlans =
            course.type !== constants.blog
                ? await getPlans({
                      planIds: course.paymentPlans,
                      ctx,
                  })
                : undefined;
        products.push({
            title: course.title,
            slug: course.slug,
            description: course.description,
            type: course.type,
            creatorId: course.creatorId,
            creatorName: course.creatorName,
            updatedAt: course.updatedAt,
            featuredImage: course.featuredImage,
            courseId: course.courseId,
            tags: course.tags,
            privacy: course.privacy,
            published: course.published,
            isFeatured: course.isFeatured,
            groups: course.type !== constants.blog ? course.groups : null,
            pageId: course.type !== constants.blog ? course.pageId : undefined,
            customers,
            sales,
            paymentPlans,
            defaultPaymentPlan: course.defaultPaymentPlan,
        });
    }

    // const products = courses.map(async (course) => ({
    //     ...course,
    //     groups: course.type !== constants.blog ? course.groups : null,
    //     pageId: course.type !== constants.blog ? course.pageId : undefined,
    //     customers:
    //         hasManagePerm && course.type !== constants.blog
    //             ? await (MembershipModel as any).countDocuments({
    //                   entityId: course.courseId,
    //                   entityType: Constants.MembershipEntityType.COURSE,
    //                   domain: ctx.subdomain._id,
    //               })
    //             : undefined,
    //     sales:
    //         hasManagePerm && course.type !== constants.blog
    //             ? (
    //                   await getActivities({
    //                       entityId: course.courseId,
    //                       type: ActivityType.PURCHASED,
    //                       duration: "lifetime",
    //                       ctx,
    //                   })
    //               ).count
    //             : undefined,
    // }));

    return products;
};

export const getProductsCount = async ({
    ctx,
    filterBy,
    tags,
    ids,
    publicView,
}: {
    ctx: GQLContext;
    filterBy?: Filter[];
    tags?: string[];
    ids?: string[];
    publicView?: boolean;
}) => {
    const query = getProductsQuery(ctx, filterBy, tags, ids, publicView);

    return await (CourseModel as any).countDocuments(query);
};

export const addGroup = async ({
    id,
    name,
    collapsed,
    ctx,
}: {
    id: string;
    name: string;
    collapsed: boolean;
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, id);
    if (
        course.type === Constants.CourseType.DOWNLOAD &&
        course.groups?.length === 1
    ) {
        throw new Error(responses.download_course_cannot_have_groups);
    }

    const existingName = (group: Group) => group.name === name;

    if (course.groups?.some(existingName)) {
        throw new Error(responses.existing_group);
    }

    const maximumRank = course.groups?.reduce(
        (acc: number, value: { rank: number }) =>
            value.rank > acc ? value.rank : acc,
        0,
    );

    await (course.groups as any).push({
        rank: maximumRank + 1000,
        name,
    } as Group);

    await (course as any).save();

    return await formatCourse(course.courseId, ctx);
};

export const removeGroup = async (
    id: string,
    courseId: string,
    ctx: GQLContext,
) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);
    const group = course.groups?.find((group) => group.id === id);

    if (!group) {
        return await formatCourse(course.courseId, ctx);
    }

    if (
        course.type === Constants.CourseType.DOWNLOAD &&
        course.groups?.length === 1
    ) {
        throw new Error(responses.download_course_last_group_cannot_be_removed);
    }

    const countOfAssociatedLessons = await Lesson.countDocuments({
        courseId,
        groupId: group.id,
        domain: ctx.subdomain._id,
    });

    if (countOfAssociatedLessons > 0) {
        throw new Error(responses.group_not_empty);
    }

    await (course.groups as any).pull({ _id: id });
    await (course as any).save();

    await UserModel.updateMany(
        {
            domain: ctx.subdomain._id,
        },
        {
            $pull: {
                "purchases.$[elem].accessibleGroups": id,
            },
        },
        {
            arrayFilters: [{ "elem.courseId": courseId }],
        },
    );

    return await formatCourse(course.courseId, ctx);
};

export const updateGroup = async ({
    id,
    courseId,
    name,
    rank,
    collapsed,
    lessonsOrder,
    drip,
    ctx,
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const $set = {};
    if (name) {
        const existingName = (group) =>
            group.name === name && group._id.toString() !== id;

        if (course.groups?.some(existingName)) {
            throw new Error(responses.existing_group);
        }

        $set["groups.$.name"] = name;
    }

    if (rank) {
        $set["groups.$.rank"] = rank;
    }

    if (
        lessonsOrder &&
        lessonsOrder.every((lessonId) => course.lessons?.includes(lessonId)) &&
        lessonsOrder.every((lessonId) =>
            course.groups
                ?.find((group) => group.id === id)
                ?.lessonsOrder.includes(lessonId),
        )
    ) {
        $set["groups.$.lessonsOrder"] = lessonsOrder;
    }

    if (typeof collapsed === "boolean") {
        $set["groups.$.collapsed"] = collapsed;
    }

    if (drip) {
        $set["groups.$.drip.status"] = drip.status;
        $set["groups.$.drip.type"] = drip.type;
        if (drip.type === Constants.dripType[0]) {
            $set["groups.$.drip.delayInMillis"] = drip.delayInMillis * 86400000;
            $set["groups.$.drip.dateInUTC"] = null;
        } else {
            $set["groups.$.drip.delayInMillis"] = null;
            $set["groups.$.drip.dateInUTC"] = drip.dateInUTC;
        }
        if (drip.email) {
            if (!drip.email.content || !drip.email.subject) {
                throw new Error(responses.invalid_drip_email);
            }
            $set["groups.$.drip.email"] = {
                content: drip.email.content,
                subject: drip.email.subject,
                published: true,
                delayInMillis: 0,
            };
        } else {
            $set["groups.$.drip.email"] = null;
        }
    }

    return await CourseModel.findOneAndUpdate(
        {
            domain: ctx.subdomain._id,
            courseId: course.courseId,
            "groups._id": id,
        },
        { $set },
        { new: true },
    );
};

export const getMembers = async ({
    ctx,
    courseId,
    page = 1,
    limit = 10,
    status,
}: {
    ctx: GQLContext;
    courseId: string;
    page?: number;
    limit?: number;
    status?: MembershipStatus;
}): Promise<
    (Pick<
        Membership,
        "userId" | "status" | "subscriptionMethod" | "subscriptionId"
    > &
        Partial<
            Pick<
                Progress,
                "completedLessons" | "createdAt" | "updatedAt" | "downloaded"
            >
        >)[]
> => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
    };

    if (status) {
        query.status = status;
    }

    const members: Membership[] = await (MembershipModel as any).paginatedFind(
        query,
        {
            page,
            limit,
        },
    );

    return await Promise.all(
        members.map(async (member) => {
            const user = await UserModel.findOne<User>({
                domain: ctx.subdomain._id,
                userId: member.userId,
            });

            const purchase = user?.purchases.find(
                (purchase) => purchase.courseId === course.courseId,
            );

            return {
                userId: member.userId,
                status: member.status,
                subscriptionMethod: member.subscriptionMethod,
                subscriptionId: member.subscriptionId,
                completedLessons: purchase?.completedLessons,
                createdAt: purchase?.createdAt,
                updatedAt: purchase?.updatedAt,
                downloaded: purchase?.downloaded,
            };
        }),
    );
};

export const getStudents = async ({
    course,
    ctx,
    text,
}: {
    course: InternalCourse;
    ctx: GQLContext;
    text?: string;
}) => {
    const matchCondition = text
        ? {
              $match: {
                  "purchases.courseId": course.courseId,
                  domain: ctx.subdomain._id,
                  $or: [
                      { email: new RegExp(text) },
                      { name: new RegExp(text) },
                  ],
              },
          }
        : {
              $match: {
                  "purchases.courseId": course.courseId,
                  domain: ctx.subdomain._id,
              },
          };

    const result = await UserModel.aggregate([
        matchCondition,
        {
            $addFields: {
                completedLessons: {
                    $filter: {
                        input: "$purchases",
                        as: "t",
                        cond: {
                            $eq: ["$$t.courseId", course.courseId],
                        },
                    },
                },
            },
        },
        {
            $unwind: "$completedLessons",
        },
        {
            $addFields: {
                progress: "$completedLessons.completedLessons",
                signedUpOn: "$completedLessons.createdAt",
                lastAccessedOn: "$completedLessons.updatedAt",
                downloaded: "$completedLessons.downloaded",
            },
        },
        {
            $project: {
                userId: 1,
                email: 1,
                name: 1,
                progress: 1,
                signedUpOn: 1,
                lastAccessedOn: 1,
                downloaded: 1,
                avatar: 1,
            },
        },
    ]);

    return result;
};
