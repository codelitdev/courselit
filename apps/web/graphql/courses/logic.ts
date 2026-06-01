/**
 * Business logic for managing courses.
 */
import CourseModel from "@/models/Course";
import { InternalCourse } from "@courselit/orm-models";
import UserModel from "@/models/User";
import { Media, User } from "@courselit/common-models";
import { responses } from "@/config/strings";
import {
    checkIfAuthenticated,
    validateOffset,
    checkOwnershipWithoutModel,
} from "@/lib/graphql";
import constants from "@/config/constants";
import {
    getPaginatedCoursesForAdmin,
    setupBlog,
    setupCourse,
    validateCourse,
} from "./helpers";
import LessonModel from "@/models/Lesson";
import GQLContext from "@/models/GQLContext";
import Filter from "./models/filter";
import mongoose from "mongoose";
import {
    Constants,
    Group,
    Membership,
    MembershipStatus,
    Progress,
    PaymentPlan,
    Course,
} from "@courselit/common-models";
import { deleteAllLessons } from "../lessons/logic";
import { deleteMedia, sealMedia } from "@/services/medialit";
import PageModel from "@/models/Page";
import { getPrevNextCursor } from "../lessons/helpers";
import {
    checkPermission,
    extractMediaIDs,
    generateUniqueId,
} from "@courselit/utils";
import { error } from "@/services/logger";
import {
    deleteProductsFromPaymentPlans,
    getInternalPaymentPlan,
    getPlans,
} from "../paymentplans/logic";
import MembershipModel from "@models/Membership";
import { getActivities } from "../activities/logic";
import { ActivityType } from "@courselit/common-models/dist/constants";
import { verifyMandatoryTags } from "../mails/helpers";
import type { Email } from "@courselit/email-editor";
import PaymentPlanModel from "@models/PaymentPlan";
import CertificateTemplateModel, {
    CertificateTemplate,
} from "@models/CertificateTemplate";
import CertificateModel from "@models/Certificate";
import ActivityModel from "@models/Activity";
import getDeletedMediaIds from "@/lib/get-deleted-media-ids";
import { deletePageInternal } from "../pages/logic";
import { replaceTempMediaWithSealedMediaInProseMirrorDoc } from "@/lib/replace-temp-media-with-sealed-media-in-prosemirror-doc";
import { validateSlug, isDuplicateKeyError } from "../pages/helpers";
import CommunityModel from "@models/Community";
import CommunityPostModel from "@models/CommunityPost";
import CommunityCommentModel from "@models/CommunityComment";
import { isPartOfDripGroup } from "../lessons/helpers";
import {
    addPostSubscription,
    deleteCommunityInternal,
    formatComment,
    normalizeCommunityPostContent,
} from "../communities/helpers";
import { recordActivity } from "@/lib/record-activity";
import canUseMongoTransactions from "@/lib/can-use-mongo-transactions";

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

async function formatCourse(
    courseId: string,
    ctx: GQLContext,
    includeUnpublishedLessons: boolean = false,
) {
    const course: InternalCourse | null = (await CourseModel.findOne({
        courseId,
        domain: ctx.subdomain._id,
    }).lean()) as unknown as InternalCourse;

    const paymentPlans = await getPlans({
        entityId: course!.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        ctx,
    });

    if (
        course.type === Constants.CourseType.COURSE ||
        course.type === Constants.CourseType.DOWNLOAD
    ) {
        const { nextLesson } = await getPrevNextCursor(
            course.courseId,
            ctx.subdomain._id,
            undefined,
            !includeUnpublishedLessons,
        );
        (course as any).firstLesson = nextLesson;
    }

    const sortedGroups = course!.groups
        ?.map((group: any) => ({
            ...group,
            id: group._id,
        }))
        .sort(
            (groupA: any, groupB: any) =>
                (groupA.rank ?? Number.MAX_SAFE_INTEGER) -
                (groupB.rank ?? Number.MAX_SAFE_INTEGER),
        );

    const result = {
        ...course,
        groups: sortedGroups,
        paymentPlans,
    };
    return result;
}

export const getCourse = async (
    id: string,
    ctx: GQLContext,
    asGuest: boolean = false,
) => {
    const course: InternalCourse | null = (await CourseModel.findOne({
        courseId: id,
        domain: ctx.subdomain._id,
    }).lean()) as unknown as InternalCourse | null;

    if (!course) {
        throw new Error(responses.item_not_found);
    }

    if (ctx.user && !asGuest) {
        const isOwner =
            checkPermission(ctx.user.permissions, [
                permissions.manageAnyCourse,
            ]) || checkOwnershipWithoutModel(course, ctx);

        if (isOwner) {
            return await formatCourse(course.courseId, ctx, true);
        }
    }

    if (course.published) {
        const formattedCourse = await formatCourse(course.courseId, ctx);
        return asGuest
            ? { ...formattedCourse, __forcePublishedLessons: true }
            : formattedCourse;
    } else {
        return null;
    }
};

async function getCourseForDiscussionOrThrow(
    ctx: GQLContext,
    courseId: string,
    session?: mongoose.ClientSession,
): Promise<InternalCourse> {
    let query = CourseModel.findOne({
        domain: ctx.subdomain._id,
        courseId,
    });
    if (session) {
        query = query.session(session);
    }
    const course = (await query) as InternalCourse | null;

    if (!course || !course.discussions) {
        throw new Error(responses.item_not_found);
    }

    return course;
}

function canManageCourse(course: InternalCourse, ctx: GQLContext): boolean {
    if (
        checkPermission(ctx.user.permissions, [
            constants.permissions.manageAnyCourse,
        ])
    ) {
        return true;
    }

    return (
        checkOwnershipWithoutModel(course, ctx) &&
        checkPermission(ctx.user.permissions, [
            constants.permissions.manageCourse,
        ])
    );
}

async function hasActiveCourseMembership(
    ctx: GQLContext,
    courseId: string,
): Promise<boolean> {
    const membership = await MembershipModel.exists({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        entityId: courseId,
        entityType: Constants.MembershipEntityType.COURSE,
        status: Constants.MembershipStatus.ACTIVE,
    });

    return Boolean(membership);
}

export const createCourse = async (
    courseData: { title: string; type: Filter },
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (
        !checkPermission(ctx.user.permissions, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
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
    const shouldToggleDiscussions = Object.prototype.hasOwnProperty.call(
        courseData,
        "discussions",
    );
    const enableDiscussions = courseData.discussions as boolean | undefined;

    if (
        typeof courseData.title === "string" &&
        courseData.title.trim() &&
        courseData.title !== course.title
    ) {
        const conflictingCourse = await CourseModel.findOne({
            domain: ctx.subdomain._id,
            title: courseData.title,
            courseId: { $ne: course.courseId },
        }).select("_id");

        if (conflictingCourse) {
            throw new Error(responses.page_id_already_exists);
        }
    }

    const mediaIdsMarkedForDeletion: string[] = [];
    if (Object.prototype.hasOwnProperty.call(courseData, "description")) {
        const nextDescription = (courseData.description ?? "") as string;
        mediaIdsMarkedForDeletion.push(
            ...getDeletedMediaIds(course.description || "", nextDescription),
        );
    }

    for (const key of Object.keys(courseData)) {
        if (key === "id" || key === "slug" || key === "discussions") {
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
    if (Object.prototype.hasOwnProperty.call(courseData, "description")) {
        for (const mediaId of mediaIdsMarkedForDeletion) {
            await deleteMedia(mediaId);
        }
        const descriptionWithSealedMedia =
            await replaceTempMediaWithSealedMediaInProseMirrorDoc(
                course.description || "",
            );
        course.description = JSON.stringify(descriptionWithSealedMedia);
    }
    if (
        Object.prototype.hasOwnProperty.call(courseData, "featuredImage") &&
        courseData.featuredImage
    ) {
        const featuredImage = await sealMedia(courseData.featuredImage.mediaId);
        if (featuredImage) {
            course.featuredImage = featuredImage;
        }
    }
    // Handle slug update with Page-first atomicity
    if (courseData.slug) {
        const newSlug = validateSlug(courseData.slug);
        if (newSlug !== course.slug) {
            const conflictingCourse = await CourseModel.findOne({
                domain: ctx.subdomain._id,
                slug: newSlug,
                courseId: { $ne: course.courseId },
            }).select("_id");

            if (conflictingCourse) {
                throw new Error(responses.page_id_already_exists);
            }

            try {
                await PageModel.updateOne(
                    {
                        domain: ctx.subdomain._id,
                        pageId: course.pageId,
                    },
                    { $set: { pageId: newSlug } },
                );
            } catch (err) {
                if (isDuplicateKeyError(err)) {
                    throw new Error(responses.page_id_already_exists);
                }
                throw err;
            }
            course.slug = newSlug;
            course.pageId = newSlug;
        }
    }
    try {
        if (shouldToggleDiscussions) {
            course = await saveCourseWithDiscussionToggle(
                course,
                ctx,
                enableDiscussions,
            );
        } else {
            course = await (course as any).save();
        }
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            throw new Error(responses.page_id_already_exists);
        }
        throw err;
    }
    await PageModel.updateOne(
        { entityId: course.courseId, domain: ctx.subdomain._id },
        { $set: { name: course.title } },
    );
    return await formatCourse(course.courseId, ctx);
};

/**
 * Asserts that the requesting user can access the given lesson within the course.
 * Checks: enrollment, drip gate. Throws if access is denied.
 * Can be used by both the lesson viewer and the course discussion helpers.
 */
export const assertCourseLessonAccess = async (
    ctx: GQLContext,
    course: InternalCourse,
    lessonId: string,
): Promise<void> => {
    const isCourseManager = canManageCourse(course, ctx);

    // Find the lesson to get its groupId
    const lesson = await LessonModel.findOne({
        domain: ctx.subdomain._id,
        lessonId,
        courseId: course.courseId,
        ...(isCourseManager ? {} : { published: true }),
    });
    if (!lesson) {
        throw new Error(responses.item_not_found);
    }

    if (isCourseManager) return;

    const hasActiveMembership = await hasActiveCourseMembership(
        ctx,
        course.courseId,
    );
    if (!hasActiveMembership) {
        throw new Error(responses.not_enrolled);
    }

    const purchase = ctx.user?.purchases?.find(
        (p: Progress) => p.courseId === course.courseId,
    );

    // Check drip gate
    if (await isPartOfDripGroup(lesson, ctx.subdomain._id)) {
        const groupAccessible = purchase?.accessibleGroups?.includes(
            lesson.groupId,
        );
        if (!groupAccessible) {
            throw new Error(responses.drip_not_released);
        }
    }
};

export const deleteCourse = async (id: string, ctx: GQLContext) => {
    const course = await getCourseOrThrow(undefined, ctx, id);
    const certificateTemplate =
        await CertificateTemplateModel.findOne<CertificateTemplate | null>({
            domain: ctx.subdomain._id,
            courseId: course.courseId,
        });
    if (certificateTemplate?.signatureImage?.mediaId) {
        await deleteMedia(certificateTemplate.signatureImage.mediaId);
    }
    if (certificateTemplate?.logo?.mediaId) {
        await deleteMedia(certificateTemplate.logo.mediaId);
    }
    await CertificateTemplateModel.deleteOne({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });
    await CertificateModel.deleteMany({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });
    await MembershipModel.deleteMany({
        domain: ctx.subdomain._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
    });
    await PaymentPlanModel.deleteMany({
        domain: ctx.subdomain._id,
        entityId: course.courseId,
        entityType: Constants.MembershipEntityType.COURSE,
    });
    await deleteProductsFromPaymentPlans({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });
    await ActivityModel.deleteMany({
        domain: ctx.subdomain._id,
        $or: [
            { entityId: course.courseId },
            { "metadata.courseId": course.courseId },
        ],
    });
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
    if (course.description) {
        const extractedMediaIds = extractMediaIDs(course.description || "");
        for (const mediaId of Array.from(extractedMediaIds)) {
            await deleteMedia(mediaId);
        }
    }
    await UserModel.updateMany(
        {
            domain: ctx.subdomain._id,
        },
        {
            $pull: {
                purchases: {
                    courseId: course.courseId,
                },
            },
        },
    );
    await deletePageInternal(ctx, course.pageId!);
    await CourseModel.deleteOne({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });

    const discussionCommunity = await CommunityModel.findOne({
        domain: ctx.subdomain._id,
        $or: [
            {
                communityId: (course as any).discussionCommunityId,
                courseId: course.courseId,
            },
            { courseId: course.courseId },
        ],
    });
    if (discussionCommunity) {
        await deleteCommunityInternal({
            ctx,
            community: discussionCommunity,
        });
    }

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
        query.creatorId = user.userId;
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

    return courses.map(async (x) => ({
        id: x.id,
        title: x.title,
        cost: x.cost,
        description: x.description,
        type: x.type,
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
    published?: boolean,
    searchText?: string,
) => {
    const query: Record<string, unknown> = {
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

    if (!publicView && typeof published === "boolean") {
        query.published = published;
    }

    if (searchText) {
        query.$text = { $search: searchText };
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
    published,
    searchText,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
    filterBy?: Filter[];
    tags?: string[];
    ids?: string[];
    publicView?: boolean;
    sort?: number;
    published?: boolean;
    searchText?: string;
}): Promise<InternalCourse[]> => {
    const query = getProductsQuery(
        ctx,
        filterBy,
        tags,
        ids,
        publicView,
        published,
        searchText,
    );

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
                      entityId: course.courseId,
                      entityType: Constants.MembershipEntityType.COURSE,
                      ctx,
                  })
                : undefined;
        const extendedCourse: InternalCourse & {
            customers?: number;
            sales: number;
            paymentPlans?: PaymentPlan[];
        } = {
            ...course,
            groups: course.type !== constants.blog ? course.groups : null,
            pageId: course.type !== constants.blog ? course.pageId : undefined,
            customers,
            sales: sales ?? 0,
            ...(paymentPlans ? { paymentPlans } : {}),
        };

        products.push(extendedCourse);
    }

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

    const maximumRank =
        course.groups?.reduce(
            (acc: number, value: { rank: number }) =>
                value.rank > acc ? value.rank : acc,
            0,
        ) ?? 0;

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

    const countOfAssociatedLessons = await LessonModel.countDocuments({
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
    drip,
    ctx,
}: {
    id: string;
    courseId: string;
    name?: string;
    rank?: number;
    collapsed?: boolean;
    drip?: {
        type?: string;
        status?: boolean;
        delayInMillis?: number;
        dateInUTC?: number;
        email?: {
            content: string;
            subject: string;
        };
    };
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);
    const currentGroup = course.groups?.find((group) => group.id === id);
    const existingDripType = currentGroup?.drip?.type;
    const effectiveDripType = drip?.type || existingDripType;

    const $set = {};
    if (name) {
        const existingName = (group) => group.name === name && group._id !== id;

        if (course.groups?.some(existingName)) {
            throw new Error(responses.existing_group);
        }

        $set["groups.$.name"] = name;
    }

    if (rank) {
        $set["groups.$.rank"] = rank;
    }

    if (typeof collapsed === "boolean") {
        $set["groups.$.collapsed"] = collapsed;
    }

    if (drip) {
        const hasDripUpdates = Object.keys(drip).some((key) => key !== "type");

        if (!effectiveDripType && hasDripUpdates) {
            throw new Error(responses.invalid_input);
        }

        if (typeof drip.status === "boolean") {
            $set["groups.$.drip.status"] = drip.status;
        }
        if (drip.type) {
            $set["groups.$.drip.type"] = drip.type;
        }
        if (effectiveDripType === Constants.dripType[0]) {
            if (
                drip.type === Constants.dripType[0] &&
                typeof drip.delayInMillis !== "number"
            ) {
                throw new Error(
                    "Relative-date drip requires a numeric delayInMillis",
                );
            }
            if (typeof drip.delayInMillis === "number") {
                $set["groups.$.drip.delayInMillis"] =
                    drip.delayInMillis * constants.relativeDripUnitInMillis;
            }
            if (drip.type === Constants.dripType[0]) {
                $set["groups.$.drip.dateInUTC"] = null;
            } else if (typeof drip.dateInUTC === "number") {
                $set["groups.$.drip.dateInUTC"] = drip.dateInUTC;
            }
        }
        if (effectiveDripType === Constants.dripType[1]) {
            if (
                drip.type === Constants.dripType[1] &&
                typeof drip.dateInUTC !== "number"
            ) {
                throw new Error("Exact-date drip requires a numeric dateInUTC");
            }
            if (drip.type === Constants.dripType[1]) {
                $set["groups.$.drip.delayInMillis"] = null;
            } else if (typeof drip.delayInMillis === "number") {
                $set["groups.$.drip.delayInMillis"] =
                    drip.delayInMillis * constants.relativeDripUnitInMillis;
            }
            if (typeof drip.dateInUTC === "number") {
                $set["groups.$.drip.dateInUTC"] = drip.dateInUTC;
            }
        }
        if (Object.prototype.hasOwnProperty.call(drip, "email")) {
            if (drip.email) {
                if (!drip.email.content || !drip.email.subject) {
                    throw new Error(responses.invalid_drip_email);
                }
                const parsedContent: Email = JSON.parse(drip.email.content);
                verifyMandatoryTags(parsedContent.content);

                $set["groups.$.drip.email"] = {
                    content: parsedContent,
                    subject: drip.email.subject,
                    published: true,
                    delayInMillis: 0,
                };
            } else {
                $set["groups.$.drip.email"] = null;
            }
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

export const moveLesson = async ({
    courseId,
    lessonId,
    destinationGroupId,
    destinationIndex,
    ctx,
}: {
    courseId: string;
    lessonId: string;
    destinationGroupId: string;
    destinationIndex: number;
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);
    const lesson = await LessonModel.findOne({
        domain: ctx.subdomain._id,
        lessonId,
    });

    if (!lesson || lesson.courseId !== course.courseId) {
        throw new Error(responses.item_not_found);
    }

    if (!course.lessons?.includes(lessonId)) {
        throw new Error(responses.invalid_input);
    }

    const destinationGroup = course.groups?.find(
        (group) => group.id === destinationGroupId,
    );
    if (!destinationGroup) {
        throw new Error(responses.invalid_input);
    }

    const normalizedGroups = (course.groups ?? []).map((group) => {
        const plainGroup =
            typeof (group as any).toObject === "function"
                ? (group as any).toObject()
                : { ...group };

        return {
            ...plainGroup,
            lessonsOrder: (plainGroup.lessonsOrder ?? []).filter(
                (id: string) => id !== lessonId,
            ),
        };
    });

    const destinationGroupIndex = normalizedGroups.findIndex((group: any) => {
        const groupId = group._id ?? group.id;
        return groupId === destinationGroupId;
    });
    if (destinationGroupIndex === -1) {
        throw new Error(responses.invalid_input);
    }

    const destinationLessons =
        normalizedGroups[destinationGroupIndex].lessonsOrder ?? [];
    normalizedGroups[destinationGroupIndex].lessonsOrder = destinationLessons;
    const safeDestinationIndex = Math.min(
        Math.max(destinationIndex, 0),
        destinationLessons.length,
    );
    destinationLessons.splice(safeDestinationIndex, 0, lessonId);

    await CourseModel.updateOne(
        {
            domain: ctx.subdomain._id,
            courseId: course.courseId,
        },
        {
            $set: {
                groups: normalizedGroups,
            },
        },
    );

    if (lesson.groupId !== destinationGroupId) {
        lesson.groupId = destinationGroupId;
        await lesson.save();
    }

    return await formatCourse(course.courseId, ctx);
};

const GROUP_RANK_GAP = 1000;

export const reorderGroups = async ({
    courseId,
    groupIds,
    ctx,
}: {
    courseId: string;
    groupIds: string[];
    ctx: GQLContext;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);
    const existingGroupIds = (course.groups ?? []).map((group) => group.id);

    if (existingGroupIds.length !== groupIds.length) {
        throw new Error(responses.invalid_input);
    }

    if (new Set(groupIds).size !== groupIds.length) {
        throw new Error(responses.invalid_input);
    }

    const existingIdSet = new Set(existingGroupIds);
    if (!groupIds.every((groupId) => existingIdSet.has(groupId))) {
        throw new Error(responses.invalid_input);
    }

    const plainGroupsById = new Map<string, any>();
    (course.groups ?? []).forEach((group) => {
        const plainGroup =
            typeof (group as any).toObject === "function"
                ? (group as any).toObject()
                : { ...group };

        plainGroupsById.set(group.id, plainGroup);
    });

    const updatedGroups = groupIds.map((groupId, index) => ({
        ...plainGroupsById.get(groupId),
        rank: (index + 1) * GROUP_RANK_GAP,
    }));

    await CourseModel.updateOne(
        {
            domain: ctx.subdomain._id,
            courseId: course.courseId,
        },
        {
            $set: {
                groups: updatedGroups,
            },
        },
    );

    return await formatCourse(course.courseId, ctx);
};

export const getMembers = async ({
    ctx,
    courseId,
    page = 1,
    limit = 10,
    status,
    searchText,
}: {
    ctx: GQLContext;
    courseId: string;
    page?: number;
    limit?: number;
    status?: MembershipStatus;
    searchText?: string;
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

    const normalizedSearchText = searchText?.trim();
    if (normalizedSearchText) {
        const escapedSearchText = normalizedSearchText.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
        );
        const matchingUsers = await UserModel.find<User>({
            domain: ctx.subdomain._id,
            $or: [
                { name: { $regex: escapedSearchText, $options: "i" } },
                { email: { $regex: escapedSearchText, $options: "i" } },
            ],
        }).select("userId");
        const matchingUserIds = matchingUsers.map((user) => user.userId);

        if (!matchingUserIds.length) {
            return [];
        }

        query.userId = { $in: matchingUserIds };
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
    course: Pick<Course, "courseId">;
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

export const getCourseCertificateTemplate = async (
    courseId: string,
    ctx: GQLContext,
) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    const certificateTemplate = await CertificateTemplateModel.findOne({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });

    return certificateTemplate;
};

export const updateCourseCertificateTemplate = async ({
    courseId,
    ctx,
    title,
    subtitle,
    description,
    signatureImage,
    signatureName,
    signatureDesignation,
    logo,
}: {
    courseId: string;
    ctx: GQLContext;
    title?: string;
    subtitle?: string;
    description?: string;
    signatureImage?: Media;
    signatureName?: string;
    signatureDesignation?: string;
    logo?: Media;
}) => {
    const course = await getCourseOrThrow(undefined, ctx, courseId);

    if (signatureImage) {
        const sealedImage = await sealMedia(signatureImage.mediaId);
        if (sealedImage) {
            signatureImage = sealedImage;
        }
    }

    if (logo) {
        const sealedLogo = await sealMedia(logo.mediaId);
        if (sealedLogo) {
            logo = sealedLogo;
        }
    }

    const updatedTemplate = await CertificateTemplateModel.findOneAndUpdate(
        {
            domain: ctx.subdomain._id,
            courseId: course.courseId,
        },
        {
            title,
            subtitle,
            description,
            signatureImage,
            signatureName,
            signatureDesignation,
            logo,
        },
        { upsert: true, new: true },
    );
    return {
        title: updatedTemplate.title,
        subtitle: updatedTemplate.subtitle,
        description: updatedTemplate.description,
        signatureImage: updatedTemplate.signatureImage,
        signatureName: updatedTemplate.signatureName,
        signatureDesignation: updatedTemplate.signatureDesignation,
        logo: updatedTemplate.logo,
    };
};

// ---------------------------------------------------------------------------
// Course Discussion Helpers
// ---------------------------------------------------------------------------

async function getDiscussionCommunity(
    ctx: GQLContext,
    course: InternalCourse,
    session?: mongoose.ClientSession,
) {
    const discussionCommunityId = (course as any).discussionCommunityId;
    if (!discussionCommunityId) {
        throw new Error(responses.item_not_found);
    }

    let query = CommunityModel.findOne({
        domain: ctx.subdomain._id,
        communityId: discussionCommunityId,
        courseId: course.courseId,
        deleted: false,
    });
    if (session) {
        query = query.session(session);
    }
    const community = await query;
    if (!community) {
        throw new Error(responses.item_not_found);
    }
    return community;
}

async function findCourseDiscussionCommunityForToggle({
    ctx,
    course,
    session,
}: {
    ctx: GQLContext;
    course: InternalCourse;
    session?: mongoose.ClientSession;
}) {
    const linkedCommunityId = (course as any).discussionCommunityId;
    if (linkedCommunityId) {
        let linkedQuery = CommunityModel.findOne({
            domain: ctx.subdomain._id,
            communityId: linkedCommunityId,
            courseId: course.courseId,
        });
        if (session) {
            linkedQuery = linkedQuery.session(session);
        }
        const linkedCommunity = await linkedQuery;
        if (linkedCommunity) {
            return linkedCommunity;
        }
    }

    let fallbackQuery = CommunityModel.findOne({
        domain: ctx.subdomain._id,
        courseId: course.courseId,
    });
    if (session) {
        fallbackQuery = fallbackQuery.session(session);
    }
    return await fallbackQuery;
}

async function runDiscussionTransaction<T>(
    operation: (session?: mongoose.ClientSession) => Promise<T>,
): Promise<T> {
    const canTransact = await canUseMongoTransactions();
    if (!canTransact) {
        return await operation();
    }

    const session = await mongoose.startSession();
    try {
        let result: T | undefined;
        await session.withTransaction(async () => {
            result = await operation(session);
        });
        return result as T;
    } finally {
        await session.endSession();
    }
}

async function saveCourseWithDiscussionToggle(
    course: InternalCourse,
    ctx: GQLContext,
    enableDiscussions: boolean | undefined,
): Promise<InternalCourse> {
    return await runDiscussionTransaction(async (session) => {
        let persistedCourseQuery = CourseModel.findOne({
            domain: ctx.subdomain._id,
            courseId: course.courseId,
        });
        if (session) {
            persistedCourseQuery = persistedCourseQuery.session(session);
        }
        const persistedCourse =
            (await persistedCourseQuery) as InternalCourse | null;
        if (!persistedCourse) {
            throw new Error(responses.item_not_found);
        }

        const nextCourseData = (course as any).toObject({
            depopulate: true,
        });
        delete nextCourseData._id;
        delete nextCourseData.__v;
        (persistedCourse as any).set(nextCourseData);

        if (enableDiscussions) {
            const internalPaymentPlan = await getInternalPaymentPlan(ctx);
            let discussionCommunity =
                await findCourseDiscussionCommunityForToggle({
                    ctx,
                    course: persistedCourse,
                    session,
                });

            if (!discussionCommunity) {
                const communityId = generateUniqueId();
                const communitySlug = `community-course-discussion-${persistedCourse.courseId}`;
                [discussionCommunity] = await CommunityModel.create(
                    [
                        {
                            domain: ctx.subdomain._id,
                            communityId,
                            name: `${persistedCourse.title} Discussions`,
                            slug: communitySlug,
                            pageId: communitySlug,
                            courseId: persistedCourse.courseId,
                            autoAcceptMembers: true,
                            enabled: true,
                            categories: ["General"],
                            defaultPaymentPlan: internalPaymentPlan.planId,
                            deleted: false,
                        },
                    ],
                    { session },
                );
            } else {
                (discussionCommunity as any).enabled = true;
                (discussionCommunity as any).deleted = false;
                if (!discussionCommunity.defaultPaymentPlan) {
                    discussionCommunity.defaultPaymentPlan =
                        internalPaymentPlan.planId;
                }
                await (discussionCommunity as any).save({ session });
            }

            (persistedCourse as any).discussionCommunityId =
                discussionCommunity.communityId;
            (persistedCourse as any).discussions = true;
        } else if (enableDiscussions === false) {
            const discussionCommunity =
                await findCourseDiscussionCommunityForToggle({
                    ctx,
                    course: persistedCourse,
                    session,
                });
            if (discussionCommunity) {
                (discussionCommunity as any).enabled = false;
                (discussionCommunity as any).deleted = false;
                await (discussionCommunity as any).save({ session });
                if (!(persistedCourse as any).discussionCommunityId) {
                    (persistedCourse as any).discussionCommunityId =
                        discussionCommunity.communityId;
                }
            }
            (persistedCourse as any).discussions = false;
        }

        return await (persistedCourse as any).save({ session });
    });
}

// ---------------------------------------------------------------------------
// getCourseDiscussionPost
// Returns the lesson-level discussion post (or null if none exists yet).
// Checks lesson access; does NOT create a membership.
// ---------------------------------------------------------------------------
export const getCourseDiscussionPost = async ({
    ctx,
    courseId,
    lessonId,
}: {
    ctx: GQLContext;
    courseId: string;
    lessonId: string;
}) => {
    checkIfAuthenticated(ctx);
    const course = await getCourseForDiscussionOrThrow(ctx, courseId);
    await assertCourseLessonAccess(ctx, course, lessonId);

    const community = await getDiscussionCommunity(ctx, course);

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        lessonId,
        deleted: false,
    });

    if (!post) {
        return null;
    }

    return {
        ...post.toObject(),
        likesCount: post.likes?.length || 0,
        hasLiked: post.likes?.includes(ctx.user?.userId) || false,
        content: normalizeCommunityPostContent(post.content),
    };
};

// ---------------------------------------------------------------------------
// getCourseDiscussionStream - paginated list of lesson-posts the user can see
// Drip-aware: filters out posts for lessons the learner cannot access yet.
// ---------------------------------------------------------------------------
export const getCourseDiscussionStream = async ({
    ctx,
    courseId,
    page = 1,
    limit = 20,
}: {
    ctx: GQLContext;
    courseId: string;
    page?: number;
    limit?: number;
}) => {
    checkIfAuthenticated(ctx);
    const course = await getCourseForDiscussionOrThrow(ctx, courseId);

    const isCourseManager = canManageCourse(course, ctx);

    const community = await getDiscussionCommunity(ctx, course);

    // Get all lessons with their drip status to build accessible set
    const allLessons = await LessonModel.find(
        {
            domain: ctx.subdomain._id,
            courseId,
            ...(isCourseManager ? {} : { published: true }),
        },
        { lessonId: 1, groupId: 1 },
    );

    let accessibleLessonIds: string[];
    if (isCourseManager) {
        accessibleLessonIds = allLessons.map((l) => l.lessonId);
    } else {
        const hasActiveMembership = await hasActiveCourseMembership(
            ctx,
            courseId,
        );
        if (!hasActiveMembership) {
            return [];
        }

        const purchase = ctx.user?.purchases?.find(
            (p: Progress) => p.courseId === courseId,
        );
        const accessibleGroupIds = new Set(purchase?.accessibleGroups ?? []);

        // Get course to check drip groups
        const courseDoc = await CourseModel.findOne({
            domain: ctx.subdomain._id,
            courseId,
        });
        const dripGroupIds = new Set(
            (courseDoc?.groups ?? [])
                .filter((g: any) => g.drip?.status)
                .map((g: any) => g._id?.toString() ?? g.id),
        );

        accessibleLessonIds = allLessons
            .filter((l) => {
                // If lesson is in a drip group, check if it's accessible
                if (dripGroupIds.has(l.groupId)) {
                    return accessibleGroupIds.has(l.groupId);
                }
                return true;
            })
            .map((l) => l.lessonId);
    }

    if (!accessibleLessonIds.length) {
        return [];
    }

    const skip = (page - 1) * limit;
    const posts = await CommunityPostModel.find({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        lessonId: { $in: accessibleLessonIds },
        deleted: false,
    })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    return posts.map((post: any) => ({
        ...post.toObject(),
        likesCount: post.likes?.length || 0,
        hasLiked: post.likes?.includes(ctx.user?.userId) || false,
        content: normalizeCommunityPostContent(post.content),
    }));
};

// ---------------------------------------------------------------------------
// getCourseDiscussionStreamCount
// ---------------------------------------------------------------------------
export const getCourseDiscussionStreamCount = async ({
    ctx,
    courseId,
}: {
    ctx: GQLContext;
    courseId: string;
}) => {
    checkIfAuthenticated(ctx);
    const course = await getCourseForDiscussionOrThrow(ctx, courseId);

    const isCourseManager = canManageCourse(course, ctx);

    const community = await getDiscussionCommunity(ctx, course);

    if (isCourseManager) {
        const lessonIds = (
            await LessonModel.find(
                {
                    domain: ctx.subdomain._id,
                    courseId,
                },
                { lessonId: 1 },
            )
        ).map((lesson) => lesson.lessonId);

        if (!lessonIds.length) {
            return 0;
        }

        return await CommunityPostModel.countDocuments({
            domain: ctx.subdomain._id,
            communityId: community.communityId,
            lessonId: { $in: lessonIds },
            deleted: false,
        });
    }

    const hasActiveMembership = await hasActiveCourseMembership(ctx, courseId);
    if (!hasActiveMembership) {
        return 0;
    }

    const purchase = ctx.user?.purchases?.find(
        (p: Progress) => p.courseId === courseId,
    );

    const allLessons = await LessonModel.find(
        {
            domain: ctx.subdomain._id,
            courseId,
            published: true,
        },
        { lessonId: 1, groupId: 1 },
    );

    const courseDoc = await CourseModel.findOne({
        domain: ctx.subdomain._id,
        courseId,
    });
    const dripGroupIds = new Set(
        (courseDoc?.groups ?? [])
            .filter((g: any) => g.drip?.status)
            .map((g: any) => g._id?.toString() ?? g.id),
    );
    const accessibleGroupIds = new Set(purchase?.accessibleGroups ?? []);

    const accessibleLessonIds = allLessons
        .filter((l) => {
            if (dripGroupIds.has(l.groupId)) {
                return accessibleGroupIds.has(l.groupId);
            }
            return true;
        })
        .map((l) => l.lessonId);

    if (!accessibleLessonIds.length) {
        return 0;
    }

    return await CommunityPostModel.countDocuments({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        lessonId: { $in: accessibleLessonIds },
        deleted: false,
    });
};

// ---------------------------------------------------------------------------
// createCourseDiscussionComment
// Creates a new top-level comment on a lesson discussion post.
// Lazily creates the lesson-level post and the user's community membership.
// ---------------------------------------------------------------------------
export const createCourseDiscussionComment = async ({
    ctx,
    courseId,
    lessonId,
    content,
}: {
    ctx: GQLContext;
    courseId: string;
    lessonId: string;
    content: string;
}) => {
    checkIfAuthenticated(ctx);

    const course = await getCourseForDiscussionOrThrow(ctx, courseId);
    await assertCourseLessonAccess(ctx, course, lessonId);

    const comment = await runDiscussionTransaction(async (session) => {
        const transactionCourse = await getCourseForDiscussionOrThrow(
            ctx,
            courseId,
            session,
        );
        const transactionCommunity = await getDiscussionCommunity(
            ctx,
            transactionCourse,
            session,
        );

        let lessonQuery = LessonModel.findOne({
            domain: ctx.subdomain._id,
            lessonId,
            courseId,
        });
        if (session) {
            lessonQuery = lessonQuery.session(session);
        }
        const lesson = await lessonQuery;
        if (!lesson) {
            throw new Error(responses.item_not_found);
        }

        // Lazily get-or-create the lesson-level discussion post
        let postQuery = CommunityPostModel.findOne({
            domain: ctx.subdomain._id,
            communityId: transactionCommunity.communityId,
            lessonId,
            deleted: false,
        });
        if (session) {
            postQuery = postQuery.session(session);
        }
        let post = await postQuery;

        if (!post) {
            try {
                [post] = await CommunityPostModel.create(
                    [
                        {
                            domain: ctx.subdomain._id,
                            communityId: transactionCommunity.communityId,
                            userId: transactionCourse.creatorId,
                            title: lesson.title,
                            content: "",
                            lessonId,
                            category:
                                (transactionCommunity as any).categories?.[0] ||
                                "General",
                        },
                    ],
                    { session },
                );
            } catch (err: any) {
                // Handle race condition: another concurrent request created the post
                if (
                    err.code === 11000 ||
                    (err.message && err.message.includes("duplicate"))
                ) {
                    let existingPostQuery = CommunityPostModel.findOne({
                        domain: ctx.subdomain._id,
                        communityId: transactionCommunity.communityId,
                        lessonId,
                        deleted: false,
                    });
                    if (session) {
                        existingPostQuery = existingPostQuery.session(session);
                    }
                    post = await existingPostQuery;
                    if (!post) {
                        throw err;
                    }
                } else {
                    throw err;
                }
            }
        }

        // Subscribe the commenter
        await addPostSubscription({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            postId: post.postId,
            session,
        });

        const [comment] = await CommunityCommentModel.create(
            [
                {
                    domain: ctx.subdomain._id,
                    communityId: transactionCommunity.communityId,
                    postId: post.postId,
                    userId: ctx.user.userId,
                    content,
                },
            ],
            { session },
        );

        return comment;
    });

    return formatComment(comment, ctx.user.userId);
};

// ---------------------------------------------------------------------------
// createCourseDiscussionReply
// Creates a reply to a comment on a lesson discussion.
// ---------------------------------------------------------------------------
export const createCourseDiscussionReply = async ({
    ctx,
    courseId,
    lessonId,
    commentId,
    content,
    parentReplyId,
}: {
    ctx: GQLContext;
    courseId: string;
    lessonId: string;
    commentId: string;
    content: string;
    parentReplyId?: string;
}) => {
    checkIfAuthenticated(ctx);

    const course = await getCourseForDiscussionOrThrow(ctx, courseId);
    await assertCourseLessonAccess(ctx, course, lessonId);

    const { parentComment, post, replyId, communityId } =
        await runDiscussionTransaction(async (session) => {
            const transactionCourse = await getCourseForDiscussionOrThrow(
                ctx,
                courseId,
                session,
            );
            const transactionCommunity = await getDiscussionCommunity(
                ctx,
                transactionCourse,
                session,
            );

            let lessonQuery = LessonModel.findOne({
                domain: ctx.subdomain._id,
                lessonId,
                courseId,
            });
            if (session) {
                lessonQuery = lessonQuery.session(session);
            }
            const lesson = await lessonQuery;
            if (!lesson) {
                throw new Error(responses.item_not_found);
            }

            let postQuery = CommunityPostModel.findOne({
                domain: ctx.subdomain._id,
                communityId: transactionCommunity.communityId,
                lessonId,
                deleted: false,
            });
            if (session) {
                postQuery = postQuery.session(session);
            }
            const post = await postQuery;
            if (!post) {
                throw new Error(responses.item_not_found);
            }

            let parentCommentQuery = CommunityCommentModel.findOne({
                domain: ctx.subdomain._id,
                communityId: transactionCommunity.communityId,
                postId: post.postId,
                commentId,
                deleted: false,
            });
            if (session) {
                parentCommentQuery = parentCommentQuery.session(session);
            }
            const parentComment = await parentCommentQuery;
            if (!parentComment) {
                throw new Error(responses.item_not_found);
            }

            const replyId = generateUniqueId();
            parentComment.replies.push({
                replyId,
                userId: ctx.user.userId,
                content,
                parentReplyId,
            });
            await parentComment.save({ session });

            await addPostSubscription({
                domain: ctx.subdomain._id,
                userId: ctx.user.userId,
                postId: post.postId,
                session,
            });

            return {
                parentComment,
                post,
                replyId,
                communityId: transactionCommunity.communityId,
            };
        });

    try {
        const parentReply = parentReplyId
            ? parentComment.replies.find(
                  (reply: any) => reply.replyId === parentReplyId,
              )
            : null;
        const targetUserId = parentReply
            ? parentReply.userId
            : parentComment.userId;
        const forUserIds =
            targetUserId && targetUserId !== ctx.user.userId
                ? [targetUserId]
                : [];

        if (!forUserIds.length) {
            return formatComment(parentComment, ctx.user.userId);
        }

        await recordActivity({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            type: Constants.ActivityType.COMMUNITY_REPLY_CREATED,
            entityId: replyId,
            metadata: {
                communityId,
                postId: post.postId,
                commentId,
                entityTargetId: commentId,
                courseId,
                lessonId,
                forUserIds,
            },
        });
    } catch (err: any) {
        error(`Error sending discussion reply notification: ${err.message}`, {
            stack: err.stack,
        });
    }

    return formatComment(parentComment, ctx.user.userId);
};

// ---------------------------------------------------------------------------
// getCourseDiscussionComments
// Returns the list of comments for a course discussion post.
// Checks lesson access; does NOT require or create community membership for reading.
// ---------------------------------------------------------------------------
export const getCourseDiscussionComments = async ({
    ctx,
    courseId,
    lessonId,
}: {
    ctx: GQLContext;
    courseId: string;
    lessonId: string;
}) => {
    checkIfAuthenticated(ctx);
    const course = await getCourseForDiscussionOrThrow(ctx, courseId);
    await assertCourseLessonAccess(ctx, course, lessonId);

    const community = await getDiscussionCommunity(ctx, course);

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        lessonId,
        deleted: false,
    });

    if (!post) {
        return [];
    }

    const comments = await CommunityCommentModel.find({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
        postId: post.postId,
    });

    return comments.map((comment) => formatComment(comment, ctx.user.userId));
};
