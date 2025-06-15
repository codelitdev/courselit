import UserModel, { User } from "../../models/User";
import { responses } from "../../config/strings";
import {
    makeModelTextSearchable,
    checkIfAuthenticated,
} from "../../lib/graphql";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
const { permissions } = constants;
import { initMandatoryPages } from "../pages/logic";
import { Domain } from "../../models/Domain";
import { checkPermission } from "@courselit/utils";
import UserSegmentModel, { UserSegment } from "../../models/UserSegment";
import mongoose from "mongoose";
import {
    Constants,
    Media,
    Membership,
    MembershipEntityType,
    MembershipStatus,
    Progress,
    UserFilterWithAggregator,
} from "@courselit/common-models";
import { recordActivity } from "../../lib/record-activity";
import { triggerSequences } from "../../lib/trigger-sequences";
import { getCourseOrThrow } from "../courses/logic";
import pug from "pug";
import courseEnrollTemplate from "@/templates/course-enroll";
import { generateEmailFrom } from "@/lib/utils";
import MembershipModel from "@models/Membership";
import CommunityModel from "@models/Community";
import CourseModel from "@models/Course";
import { addMailJob } from "@/services/queue";
import { getPaymentMethodFromSettings } from "@/payments-new";
import { checkForInvalidPermissions } from "@/lib/check-invalid-permissions";
import { activateMembership } from "@/app/api/payment/helpers";
import {
    createInternalPaymentPlan,
    getInternalPaymentPlan,
} from "../paymentplans/logic";
import {
    convertFiltersToDBConditions,
    InternalMembership,
} from "@courselit/common-logic";

const removeAdminFieldsFromUserObject = (user: User) => ({
    id: user._id,
    name: user.name,
    userId: user.userId,
    bio: user.bio,
    email: user.email,
    avatar: user.avatar,
});

export const getUser = async (userId = null, ctx: GQLContext) => {
    let user: User | undefined | null;
    user = ctx.user;

    if (userId) {
        user = await UserModel.findOne({ userId, domain: ctx.subdomain._id });
    }

    if (!user) {
        throw new Error(responses.item_not_found);
    }

    if (
        ctx.user &&
        (user.userId === ctx.user.userId ||
            checkPermission(ctx.user.permissions, [permissions.manageUsers]))
    ) {
        return user;
    } else {
        return removeAdminFieldsFromUserObject(user);
    }
};

const validateUserProperties = (user) => {
    checkForInvalidPermissions(user.permissions);
};

interface UserData {
    id: string;
    name?: string;
    active?: boolean;
    bio?: string;
    permissions?: string[];
    subscribedToUpdates?: boolean;
    tags?: string[];
    avatar?: Media;
}

export const updateUser = async (userData: UserData, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);
    const { id } = userData;
    const keys = Object.keys(userData);

    const hasPermissionToManageUser = checkPermission(ctx.user.permissions, [
        permissions.manageUsers,
    ]);
    const isModifyingSelf = id === ctx.user._id.toString();
    const restrictedKeys = ["permissions", "active"];

    if (
        (isModifyingSelf && keys.some((key) => restrictedKeys.includes(key))) ||
        (!isModifyingSelf && !hasPermissionToManageUser)
    ) {
        throw new Error(responses.action_not_allowed);
    }

    let user = await UserModel.findOne({ _id: id, domain: ctx.subdomain._id });
    if (!user) throw new Error(responses.item_not_found);

    for (const key of keys.filter((key) => key !== "id")) {
        if (key === "tags") {
            addTags(userData["tags"]!, ctx);
        }

        user[key] = userData[key];
    }

    validateUserProperties(user);

    user = await user.save();

    if (userData.name) {
        await updateCoursesForCreatorName(user.userId || user.id, user.name);
    }

    return user;
};

export const inviteCustomer = async (
    email: string,
    tags: string[],
    id: string,
    ctx: GQLContext,
) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const course = await getCourseOrThrow(undefined, ctx, id);
    if (!course.published) {
        throw new Error(responses.cannot_invite_to_unpublished_product);
    }

    const sanitizedEmail = (email as string).toLowerCase();
    let user = await UserModel.findOne({
        email: sanitizedEmail,
        domain: ctx.subdomain._id,
    });
    if (!user) {
        user = await createUser({
            domain: ctx.subdomain!,
            email: sanitizedEmail,
            subscribedToUpdates: true,
            invited: true,
        });
    }

    if (tags.length) {
        user = await updateUser(
            { id: user._id, tags: [...user.tags, ...tags] },
            ctx,
        );
    }

    const paymentPlan = await getInternalPaymentPlan(ctx);

    const membership = await getMembership({
        domainId: ctx.subdomain._id,
        userId: user.userId,
        entityType: Constants.MembershipEntityType.COURSE,
        entityId: course.courseId,
        planId: paymentPlan.planId,
    });

    if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return user;
    }

    await activateMembership(ctx.subdomain!, membership, paymentPlan);

    try {
        const emailBody = pug.render(courseEnrollTemplate, {
            courseName: course.title,
            loginLink: `${ctx.address}/login`,
            hideCourseLitBranding:
                ctx.subdomain.settings?.hideCourseLitBranding,
        });

        await addMailJob({
            to: [user.email],
            subject: `You have been invited to ${course.title}`,
            body: emailBody,
            from: generateEmailFrom({
                name: ctx.subdomain?.settings?.title || ctx.subdomain.name,
                email: process.env.EMAIL_FROM || ctx.subdomain.email,
            }),
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.log("error", error);
    }

    return user;
};

const updateCoursesForCreatorName = async (creatorId, creatorName) => {
    await CourseModel.updateMany(
        {
            creatorId,
        },
        {
            creatorName,
        },
    );
};

interface GetUsersParams {
    page?: number;
    limit?: number;
    filters?: string;
    ctx: GQLContext;
}

export const getUsers = async ({
    page = 1,
    limit = constants.itemsPerPage,
    filters,
    ctx,
}: GetUsersParams) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const searchUsers = makeModelTextSearchable(UserModel);
    const query = await buildQueryFromSearchData(ctx.subdomain._id, filters);
    const users = await searchUsers(
        {
            offset: page,
            query,
            graphQLContext: ctx,
        },
        {
            itemsPerPage: limit,
            sortByColumn: "createdAt",
            sortOrder: -1,
        },
    );

    return users.map(async (user) => ({
        ...user,
        content: await getUserContentInternal(ctx, user),
    }));
};

export const getUsersCount = async (ctx: GQLContext, filters?: string) => {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const query = await buildQueryFromSearchData(ctx.subdomain._id, filters);
    return await UserModel.countDocuments(query);
};

const buildQueryFromSearchData = async (
    domain: mongoose.Types.ObjectId,
    inputFilters?: string,
): Promise<Record<string, unknown>> => {
    let filters = {};
    if (inputFilters) {
        const filtersWithAggregator: UserFilterWithAggregator =
            JSON.parse(inputFilters);
        filters = await convertFiltersToDBConditions({
            domain,
            filter: filtersWithAggregator,
            membershipModel: MembershipModel,
        });
    }
    return { domain, ...filters };
};

export const recordProgress = async ({
    lessonId,
    courseId,
    user,
}: {
    lessonId: string;
    courseId: string;
    user: User;
}) => {
    const enrolledItemIndex = user.purchases.findIndex(
        (progress: Progress) => progress.courseId === courseId,
    );

    if (enrolledItemIndex === -1) {
        throw new Error(responses.not_enrolled);
    }

    if (
        user.purchases[enrolledItemIndex].completedLessons.indexOf(lessonId) ===
        -1
    ) {
        user.purchases[enrolledItemIndex].completedLessons.push(lessonId);
        await (user as any).save();
    }
};

export async function createUser({
    domain,
    name,
    email,
    lead,
    superAdmin = false,
    subscribedToUpdates = true,
    invited,
    permissions = [],
}: {
    domain: Domain;
    name?: string;
    email: string;
    lead?:
        | typeof constants.leadWebsite
        | typeof constants.leadNewsletter
        | typeof constants.leadApi
        | typeof constants.leadDownload;
    superAdmin?: boolean;
    subscribedToUpdates?: boolean;
    invited?: boolean;
    permissions?: string[];
}): Promise<User> {
    if (permissions.length) {
        checkForInvalidPermissions(permissions);
    }

    const rawResult = await UserModel.findOneAndUpdate(
        { domain: domain._id, email },
        {
            $setOnInsert: {
                domain: domain._id,
                name,
                email: email.toLowerCase(),
                active: true,
                purchases: [],
                permissions: superAdmin
                    ? [
                          constants.permissions.manageCourse,
                          constants.permissions.manageAnyCourse,
                          constants.permissions.publishCourse,
                          constants.permissions.manageMedia,
                          constants.permissions.manageSite,
                          constants.permissions.manageSettings,
                          constants.permissions.manageUsers,
                          constants.permissions.manageCommunity,
                      ]
                    : [
                          constants.permissions.enrollInCourse,
                          constants.permissions.manageMedia,
                          ...permissions,
                      ],
                lead: lead || constants.leadWebsite,
                subscribedToUpdates,
                invited,
            },
        },
        { upsert: true, new: true, includeResultMetadata: true },
    );

    const createdUser = rawResult.value;
    const isNewUser = !rawResult.lastErrorObject!.updatedExisting;

    if (isNewUser) {
        if (superAdmin) {
            await initMandatoryPages(domain, createdUser);
            await createInternalPaymentPlan(domain, createdUser.userId);
        }

        await recordActivity({
            domain: domain._id,
            userId: createdUser.userId,
            type: "user_created",
        });

        if (createdUser.subscribedToUpdates) {
            await triggerSequences({
                user: createdUser,
                event: Constants.EventType.SUBSCRIBER_ADDED,
            });

            await recordActivity({
                domain: domain!._id,
                userId: createdUser.userId,
                type: "newsletter_subscribed",
            });
        }
    }

    return createdUser;
}

export async function getSegments(ctx: GQLContext): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });

    return segments;
}

export async function createSegment(
    segmentData: { name: string; filter: string },
    ctx: GQLContext,
): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const filter: UserFilterWithAggregator = JSON.parse(segmentData.filter);

    await UserSegmentModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        name: segmentData.name,
        filter,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });

    return segments;
}

export async function deleteSegment(
    segmentId: string,
    ctx: GQLContext,
): Promise<UserSegment[]> {
    checkIfAuthenticated(ctx);
    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await UserSegmentModel.deleteOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        segmentId,
    });

    const segments = await UserSegmentModel.find({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
    });

    return segments;
}

export const getTags = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    if (!ctx.subdomain.tags) {
        ctx.subdomain.tags = [];
        await (ctx.subdomain as any).save();
    }

    return ctx.subdomain.tags;
};

export const getTagsWithDetails = async (ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    const tagsWithUsersCount = await UserModel.aggregate([
        { $unwind: "$tags" },
        {
            $match: {
                tags: { $in: ctx.subdomain.tags },
                domain: ctx.subdomain._id,
            },
        },
        {
            $group: {
                _id: "$tags",
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                tag: "$_id",
                count: 1,
                _id: 0,
            },
        },
        {
            $unionWith: {
                coll: "domains",
                pipeline: [
                    { $match: { _id: ctx.subdomain._id } },
                    { $unwind: "$tags" },
                    { $project: { tag: "$tags", _id: 0 } },
                ],
            },
        },
        {
            $group: {
                _id: "$tag",
                count: { $sum: "$count" },
            },
        },
        {
            $project: {
                tag: "$_id",
                count: 1,
                _id: 0,
            },
        },
        { $sort: { count: -1 } },
    ]);

    return tagsWithUsersCount;
};

export const addTags = async (tags: string[], ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    for (let tag of tags) {
        if (!ctx.subdomain.tags.includes(tag)) {
            ctx.subdomain.tags.push(tag);
        }
    }
    await (ctx.subdomain as any).save();

    return ctx.subdomain.tags;
};

export const deleteTag = async (tag: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await UserModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { tags: tag } },
    );
    const tagIndex = ctx.subdomain.tags.indexOf(tag);
    ctx.subdomain.tags.splice(tagIndex, 1);

    await (ctx.subdomain as any).save();

    return getTagsWithDetails(ctx);
};

export const untagUsers = async (tag: string, ctx: GQLContext) => {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
        throw new Error(responses.action_not_allowed);
    }

    await UserModel.updateMany(
        { domain: ctx.subdomain._id },
        { $pull: { tags: tag } },
    );

    return getTagsWithDetails(ctx);
};

export const getUserContent = async (
    ctx: GQLContext,
    userId?: string,
): Promise<any> => {
    checkIfAuthenticated(ctx);

    let id = ctx.user.userId;
    if (userId) {
        if (!checkPermission(ctx.user.permissions, [permissions.manageUsers])) {
            throw new Error(responses.action_not_allowed);
        }
        id = userId;
    }

    const user = await UserModel.findOne({
        userId: id,
        domain: ctx.subdomain._id,
    });

    if (!user) {
        throw new Error(responses.item_not_found);
    }

    return await getUserContentInternal(ctx, user);
};

async function getUserContentInternal(ctx: GQLContext, user: User) {
    const memberships = await MembershipModel.find<Membership>({
        domain: ctx.subdomain._id,
        userId: user.userId,
        status: Constants.MembershipStatus.ACTIVE,
    });

    const content: Record<string, unknown>[] = [];

    for (const membership of memberships) {
        if (membership.entityType === Constants.MembershipEntityType.COURSE) {
            const course = await CourseModel.findOne({
                courseId: membership.entityId,
                domain: ctx.subdomain._id,
            });

            if (course) {
                content.push({
                    entityType: Constants.MembershipEntityType.COURSE,
                    entity: {
                        id: course.courseId,
                        title: course.title,
                        slug: course.slug,
                        type: course.type,
                        totalLessons: course.lessons.length,
                        completedLessonsCount: user.purchases.find(
                            (progress: Progress) =>
                                progress.courseId === course.courseId,
                        )?.completedLessons.length,
                        featuredImage: course.featuredImage,
                    },
                });
            }
        }
        if (
            membership.entityType === Constants.MembershipEntityType.COMMUNITY
        ) {
            const community = await CommunityModel.findOne({
                communityId: membership.entityId,
                domain: ctx.subdomain._id,
                deleted: false,
            });

            if (community) {
                content.push({
                    entityType: Constants.MembershipEntityType.COMMUNITY,
                    entity: {
                        id: community.communityId,
                        title: community.name,
                        featuredImage: community.featuredImage,
                    },
                });
            }
        }
    }

    return content;
}

export const getMembershipStatus = async ({
    entityId,
    entityType,
    ctx,
}: {
    entityId: string;
    entityType: MembershipEntityType;
    ctx: GQLContext;
}): Promise<MembershipStatus | null> => {
    checkIfAuthenticated(ctx);

    const membership: Membership | null = await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        entityId,
        entityType,
        userId: ctx.user.userId,
    });

    return membership ? membership.status : null;
};

export const hasActiveSubscription = async (
    member: Membership,
    ctx: GQLContext,
) => {
    if (!member.subscriptionId || !member.subscriptionMethod) {
        return false;
    }

    const paymentMethod = await getPaymentMethodFromSettings(
        ctx.subdomain.settings,
        member.subscriptionMethod,
    );
    const isSubscriptionActive = await paymentMethod.validateSubscription(
        member.subscriptionId,
    );

    return isSubscriptionActive;
};

export const getMembership = async ({
    domainId,
    userId,
    entityType,
    entityId,
    planId,
}: {
    domainId: mongoose.Types.ObjectId;
    userId: string;
    entityType: MembershipEntityType;
    entityId: string;
    planId: string;
}): Promise<InternalMembership> => {
    const existingMembership =
        await MembershipModel.findOne<InternalMembership>({
            domain: domainId,
            userId,
            entityType,
            entityId,
        });

    let membership: InternalMembership =
        existingMembership ||
        (await MembershipModel.create({
            domain: domainId,
            userId,
            paymentPlanId: planId,
            entityId,
            entityType,
            status: Constants.MembershipStatus.PENDING,
        }));

    return membership;
};
