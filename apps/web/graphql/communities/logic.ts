import { checkPermission, generateUniqueId, slugify } from "@courselit/utils";
import CommunityModel, { InternalCommunity } from "@models/Community";
import constants from "../../config/constants";
import GQLContext from "../../models/GQLContext";
import { checkIfAuthenticated } from "@/lib/graphql";
import { responses } from "@/config/strings";
import {
    Community,
    Constants,
    CommunityMemberStatus,
    CommunityPost,
    CommunityComment,
    CommunityMedia,
    Membership,
    Media,
    CommunityReportType,
    CommunityReportStatus,
    MembershipRole,
    PaymentPlan,
    CommunityMediaTypes,
} from "@courselit/common-models";
import CommunityPostModel from "@models/CommunityPost";
import {
    getNextRoleForCommunityMember,
    getNextStatusForCommunityMember,
    getNextStatusForCommunityReport,
} from "@ui-lib/utils";
import CommunityCommentModel from "@models/CommunityComment";
import PageModel from "@models/Page";
import PaymentPlanModel from "@models/PaymentPlan";
import MembershipModel from "@models/Membership";
import {
    addIncludedProductsMemberships,
    deleteMembershipsActivatedViaPaymentPlan,
    getInternalPaymentPlan,
    getPlans,
} from "../paymentplans/logic";
import { getPaymentMethodFromSettings } from "@/payments-new";
import CommunityReportModel, {
    InternalCommunityReport,
} from "@models/CommunityReport";
import {
    addPostSubscription,
    CommunityReportPartial,
    formatComment,
    formatCommunityReport,
    formatPost,
    getPostSubscribersExceptUserId,
    hasPermissionToDelete,
    PublicPost,
    toggleContentVisibility,
} from "./helpers";
import { error } from "@/services/logger";
import NotificationModel from "@models/Notification";
import { addNotification } from "@/services/queue";
import { hasActiveSubscription } from "../users/logic";
import { internal } from "@config/strings";
import { hasCommunityPermission as hasPermission } from "@ui-lib/utils";
import ActivityModel from "@models/Activity";
import getDeletedMediaIds, {
    extractMediaIDs,
} from "@/lib/get-deleted-media-ids";
import { deleteMedia } from "@/services/medialit";
import CommunityPostSubscriberModel from "@models/CommunityPostSubscriber";
import InvoiceModel from "@models/Invoice";
import { InternalMembership } from "@courselit/common-logic";

const { permissions, communityPage } = constants;

export async function createCommunity({
    name,
    ctx,
}: {
    name: string;
    ctx: GQLContext;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const existingCommunity = await CommunityModel.findOne({
        domain: ctx.subdomain._id,
        name,
        deleted: false,
    });

    if (existingCommunity) {
        throw new Error(responses.community_exists);
    }

    const communityId = generateUniqueId();

    const pageId = `${slugify(name.toLowerCase())}-${communityId.substring(0, 5)}`;

    await PageModel.create({
        domain: ctx.subdomain._id,
        pageId,
        type: communityPage,
        creatorId: ctx.user.userId,
        name,
        entityId: communityId,
        layout: [
            {
                name: "header",
                deleteable: false,
                shared: true,
            },
            {
                name: "banner",
            },
            {
                name: "footer",
                deleteable: false,
                shared: true,
            },
        ],
        title: name,
    });

    const community = await CommunityModel.create<Community>({
        domain: ctx.subdomain._id,
        communityId,
        name,
        pageId,
    });

    const paymentPlan = await getInternalPaymentPlan(ctx);
    await MembershipModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        status: Constants.MembershipStatus.ACTIVE,
        joiningReason: internal.joining_reason_creator,
        role: Constants.MembershipRole.MODERATE,
        paymentPlanId: paymentPlan.planId,
    });

    return community;
}

export async function getCommunity({
    ctx,
    id,
}: {
    ctx: GQLContext;
    id: string;
}): Promise<Community | null> {
    const query = {
        domain: ctx.subdomain._id,
        communityId: id,
        deleted: false,
    };

    const community = await CommunityModel.findOne<InternalCommunity>(query);

    if (
        !community ||
        (!community.enabled &&
            (!ctx.user ||
                !checkPermission(ctx.user.permissions, [
                    permissions.manageCommunity,
                ])))
    ) {
        return null;
    }

    return await formatCommunity(community, ctx);
}

export async function getCommunities({
    ctx,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
}): Promise<Community[]> {
    const query: Partial<InternalCommunity> = {
        domain: ctx.subdomain._id,
        deleted: false,
    };

    if (
        !ctx.user ||
        (ctx.user &&
            !checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ]))
    ) {
        query.enabled = true;
    }

    const communities = await (CommunityModel as any).paginatedFind(query, {
        page,
        limit,
    });

    return communities.map(async (community) => ({
        name: community.name,
        communityId: community.communityId,
        banner: community.banner,
        enabled: community.enabled,
        categories: community.categories,
        autoAcceptMembers: community.autoAcceptMembers,
        description: community.description,
        pageId: community.pageId,
        products: community.products,
        joiningReasonText: community.joiningReasonText,
        paymentPlans: await getPlans({
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            ctx,
        }),
        defaultPaymentPlan: community.defaultPaymentPlan,
        featuredImage: community.featuredImage,
        membersCount: await getMembersCount({
            ctx,
            communityId: community.communityId,
            status: Constants.MembershipStatus.ACTIVE,
        }),
    }));
}

export async function getCommunitiesCount({
    ctx,
}: {
    ctx: GQLContext;
}): Promise<number> {
    const query: Partial<InternalCommunity> = {
        domain: ctx.subdomain._id,
    };

    if (
        !ctx.user ||
        (ctx.user &&
            !checkPermission(ctx.user.permissions, [
                permissions.manageCommunity,
            ]))
    ) {
        query.enabled = true;
    }

    const count = await (CommunityModel as any).countDocuments(query);

    return count;
}

export async function updateCommunity({
    id,
    name,
    description,
    ctx,
    enabled,
    banner,
    autoAcceptMembers,
    joiningReasonText,
    featuredImage,
}: {
    id: string;
    name?: string;
    description?: string;
    ctx: GQLContext;
    enabled?: boolean;
    banner?: string;
    autoAcceptMembers?: boolean;
    joiningReasonText?: string;
    featuredImage?: Media;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, id);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    if (name) {
        community.name = name;
    }

    const descriptionMediaIdsMarkedForDeletion: string[] = [];
    const bannerMediaIdsMarkedForDeletion: string[] = [];

    if (typeof description !== "undefined") {
        const nextDescription = (description ?? "") as string;
        descriptionMediaIdsMarkedForDeletion.push(
            ...getDeletedMediaIds(
                JSON.stringify(community.description || ""),
                nextDescription,
            ),
        );

        if (nextDescription) {
            community.description = JSON.parse(nextDescription);
        }
    }

    if (typeof banner !== "undefined") {
        const nextBanner = (banner ?? "") as string;
        bannerMediaIdsMarkedForDeletion.push(
            ...getDeletedMediaIds(
                JSON.stringify(community.banner || ""),
                nextBanner,
            ),
        );

        if (nextBanner) {
            community.banner = JSON.parse(nextBanner);
        }
    }

    if (autoAcceptMembers !== undefined) {
        community.autoAcceptMembers = autoAcceptMembers;
    }

    if (joiningReasonText !== undefined) {
        community.joiningReasonText = joiningReasonText;
    }

    if (featuredImage !== undefined) {
        community.featuredImage = featuredImage;
    }

    const plans = await getPlans({
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        ctx,
    });
    if (enabled !== undefined) {
        community.enabled = enabled;

        if (enabled) {
            if (plans.length === 0) {
                throw new Error(responses.payment_plan_required);
            }
            if (!community.defaultPaymentPlan) {
                throw new Error(responses.default_payment_plan_required);
            }
        }
    }

    for (const mediaId of descriptionMediaIdsMarkedForDeletion.concat(
        bannerMediaIdsMarkedForDeletion,
    )) {
        await deleteMedia(mediaId);
    }

    await (community as any).save();

    return await formatCommunity(community, ctx);
}

export async function addCategory({
    id,
    category,
    ctx,
}: {
    id: string;
    category: string;
    ctx: GQLContext;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, id);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    if (!community.categories.includes(category)) {
        community.categories.push(category);
    }

    await (community as any).save();

    return await formatCommunity(community, ctx);
}

export async function deleteCategory({
    id,
    category,
    ctx,
    migrateToCategory,
}: {
    id: string;
    category: string;
    ctx: GQLContext;
    migrateToCategory?: string;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, id);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    if (community.categories.length === 1) {
        throw new Error(responses.cannot_delete_last_category);
    }

    if (migrateToCategory) {
        // Logic to migrate posts from the deleted category to the new category
        // This is a placeholder and should be replaced with actual migration logic
        console.log(`Migrating posts from ${category} to ${migrateToCategory}`); // eslint-disable-line no-console
    }

    community.categories = community.categories.filter((c) => c !== category);

    await (community as any).save();

    return await formatCommunity(community, ctx);
}

export async function joinCommunity({
    id,
    joiningReason,
    ctx,
}: {
    id: string;
    joiningReason: string;
    ctx: GQLContext;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    if (!ctx.user.name) {
        throw new Error(responses.profile_incomplete);
    }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const communityPaymentPlans = await getPlans({
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        ctx,
    });

    if (communityPaymentPlans.length === 0) {
        throw new Error(responses.community_has_no_payment_plans);
    }

    const freePaymentPlanOfCommunity = await PaymentPlanModel.findOne({
        domain: ctx.subdomain._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        type: Constants.PaymentPlanType.FREE,
        archived: false,
    });

    if (!freePaymentPlanOfCommunity) {
        throw new Error(responses.community_requires_payment);
    }

    let member = await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        paymentPlanId: freePaymentPlanOfCommunity.planId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        entityId: community.communityId,
    });

    if (!member) {
        member = await MembershipModel.create({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            paymentPlanId: freePaymentPlanOfCommunity.planId,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            status: community.autoAcceptMembers
                ? Constants.MembershipStatus.ACTIVE
                : Constants.MembershipStatus.PENDING,
            role: community.autoAcceptMembers
                ? Constants.MembershipRole.POST
                : Constants.MembershipRole.COMMENT,
            joiningReason,
        });

        // const communityManagers: User[] = await UserModel.find(
        //     {
        //         domain: ctx.subdomain._id,
        //         permissions: permissions.manageCommunity,
        //         userId: { $nin: [ctx.user.userId] },
        //     },
        //     {
        //         _id: 0,
        //         userId: 1,
        //     },
        // ).lean();
        const communityManagers: Membership[] = await MembershipModel.find({
            domain: ctx.subdomain._id,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            role: Constants.MembershipRole.MODERATE,
        });

        addNotification({
            domain: ctx.subdomain._id.toString(),
            entityId: community.communityId,
            entityAction:
                Constants.NotificationEntityAction
                    .COMMUNITY_MEMBERSHIP_REQUESTED,
            forUserIds: communityManagers.map((m) => m.userId),
            userId: ctx.user.userId,
        });
    }

    return member;
}

async function getMembership(
    ctx: GQLContext,
    communityId: string,
): Promise<Membership | null> {
    return await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        userId: ctx.user.userId,
        status: Constants.MembershipStatus.ACTIVE,
    });
}

export async function createCommunityPost({
    communityId,
    title,
    content,
    category,
    media,
    ctx,
}: {
    communityId: string;
    title: string;
    content: string;
    category: string;
    media?: CommunityMedia[];
    ctx: GQLContext;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.POST)) {
        throw new Error(responses.action_not_allowed);
    }

    if (!community.categories.includes(category)) {
        throw new Error(responses.invalid_category);
    }

    const post = await CommunityPostModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        communityId: community.communityId,
        title,
        content,
        category,
        media,
    });

    await addPostSubscription({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        postId: post.postId,
    });

    try {
        const members = await MembershipModel.find<Membership>({
            domain: ctx.subdomain._id,
            entityId: community.communityId,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            status: Constants.MembershipStatus.ACTIVE,
        }).lean();

        await addNotification({
            domain: ctx.subdomain._id.toString(),
            entityId: post.postId,
            entityAction: Constants.NotificationEntityAction.COMMUNITY_POSTED,
            forUserIds: members
                .map((m) => m.userId)
                .filter((id) => id !== ctx.user.userId),
            userId: ctx.user.userId,
        });
    } catch (err) {
        error(
            `Error sending notifications for community post: ${err.message}`,
            {
                communityId: community.communityId,
                postId: post.postId,
                stack: err.stack,
            },
        );
    }

    return formatPost(post, ctx.user.userId);
}

export async function deleteCommunityPost({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<CommunityPost> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
        postId,
    };
    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     query["userId"] = ctx.user.userId;
    // }
    const member = await getMembership(ctx, communityId);
    if (!hasPermission(member!, Constants.MembershipRole.MODERATE)) {
        query["userId"] = ctx.user.userId;
    }

    const post = await CommunityPostModel.findOne<CommunityPost>(query);

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    post.deleted = true;
    await (post as any).save();

    return post;
}

export async function getPost({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost | null> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );
    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        deleted: false,
    });
    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);
    if (!member) {
        return null;
    }

    return formatPost(post, ctx.user.userId);
}

function getCommunityQuery(ctx: GQLContext, communityId: string) {
    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
        deleted: false,
    };
    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        query.enabled = true;
    }
    return query;
}

export async function getPosts({
    ctx,
    communityId,
    page = 1,
    limit = 10,
    category,
}: {
    ctx: GQLContext;
    communityId: string;
    page?: number;
    limit?: number;
    category?: string;
}): Promise<PublicPost[]> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );
    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);
    if (!member) {
        return [];
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
        deleted: false,
    };

    if (category) {
        query.category = category;
    }

    let posts = await (CommunityPostModel as any).paginatedFind(query, {
        page,
        limit,
    });

    if (!category) {
        const pinnedPosts = await CommunityPostModel.find({
            domain: ctx.subdomain._id,
            communityId,
            pinned: true,
            deleted: false,
        });
        posts = posts.filter((post) => !post.pinned);
        posts.unshift(...pinnedPosts);
    }

    return posts.map(async (post) => formatPost(post, ctx.user.userId));
}

export async function getPostsCount({
    ctx,
    communityId,
    category,
}: {
    ctx: GQLContext;
    communityId: string;
    category?: string;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member) {
        return 0;
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
        deleted: false,
    };

    if (category) {
        query.category = category;
    }

    const count = await CommunityPostModel.countDocuments(query);

    return count;
}

export async function getMember({
    ctx,
    communityId,
}: {
    ctx: GQLContext;
    communityId: string;
}): Promise<string> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        userId: ctx.user.userId,
    });

    return member;
}

export async function getMembers({
    ctx,
    communityId,
    page = 1,
    limit = 10,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    page?: number;
    limit?: number;
    status?: CommunityMemberStatus;
}): Promise<
    Pick<
        Membership,
        | "userId"
        | "status"
        | "role"
        | "joiningReason"
        | "rejectionReason"
        | "subscriptionMethod"
        | "subscriptionId"
    >[]
> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
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

    return members.map((member) => ({
        userId: member.userId,
        status: member.status,
        role: member.role,
        joiningReason: member.joiningReason,
        rejectionReason: member.rejectionReason,
        subscriptionMethod: member.subscriptionMethod,
        subscriptionId: member.subscriptionId,
    }));
}

async function formatCommunity(
    community: Community,
    ctx: GQLContext,
): Promise<Community & Pick<InternalCommunity, "autoAcceptMembers">> {
    return {
        name: community.name,
        communityId: community.communityId,
        banner: community.banner,
        enabled: community.enabled,
        categories: community.categories,
        autoAcceptMembers: community.autoAcceptMembers,
        description: community.description,
        pageId: community.pageId,
        products: community.products,
        joiningReasonText: community.joiningReasonText,
        defaultPaymentPlan: community.defaultPaymentPlan,
        featuredImage: community.featuredImage,
        membersCount: await getMembersCount({
            ctx,
            communityId: community.communityId,
            status: Constants.MembershipStatus.ACTIVE,
        }),
    };
}

export async function getMembersCount({
    ctx,
    communityId,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    status?: CommunityMemberStatus;
}): Promise<number> {
    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
    };

    if (status) {
        query.status = status;
    }

    const count = await (MembershipModel as any).countDocuments(query);

    return count;
}

export async function updateMemberStatus({
    ctx,
    communityId,
    userId,
    rejectionReason,
}: {
    ctx: GQLContext;
    communityId: string;
    userId: string;
    rejectionReason?: string;
}): Promise<Membership> {
    checkIfAuthenticated(ctx);

    if (ctx.user.userId === userId) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.item_not_found);
    }

    const targetMember = await MembershipModel.findOne<Membership>({
        domain: ctx.subdomain._id,
        userId,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
    });

    if (!targetMember) {
        throw new Error(responses.item_not_found);
    }

    const otherActiveModeratorsCount = await MembershipModel.countDocuments({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        role: Constants.MembershipRole.MODERATE,
        status: Constants.MembershipStatus.ACTIVE,
        userId: { $ne: userId },
    });

    if (otherActiveModeratorsCount === 0) {
        throw new Error(responses.action_not_allowed);
    }

    const nextStatus = getNextStatusForCommunityMember(
        targetMember.status as CommunityMemberStatus,
    );
    if (nextStatus === Constants.MembershipStatus.REJECTED) {
        if (!rejectionReason) {
            throw new Error(responses.rejection_reason_missing);
        }
        if (await hasActiveSubscription(targetMember, ctx)) {
            throw new Error(
                responses.cannot_reject_member_with_active_subscription,
            );
        }
        targetMember.rejectionReason = rejectionReason;

        if (targetMember.paymentPlanId) {
            await deleteMembershipsActivatedViaPaymentPlan({
                domain: ctx.subdomain._id,
                userId: targetMember.userId,
                paymentPlanId: targetMember.paymentPlanId,
            });
        }
    }

    targetMember.status = nextStatus;

    if (targetMember.status === Constants.MembershipStatus.ACTIVE) {
        targetMember.rejectionReason = undefined;
        const paymentPlan = (await PaymentPlanModel.findOne({
            domain: ctx.subdomain._id,
            planId: targetMember.paymentPlanId,
        })) as PaymentPlan;

        if (targetMember.paymentPlanId) {
            await addIncludedProductsMemberships({
                domain: ctx.subdomain._id,
                userId: targetMember.userId,
                paymentPlan,
                sessionId: targetMember.sessionId,
            });
        }

        await addNotification({
            domain: ctx.subdomain._id.toString(),
            entityId: community.communityId,
            entityAction:
                Constants.NotificationEntityAction.COMMUNITY_MEMBERSHIP_GRANTED,
            forUserIds: [userId],
            userId: ctx.user.userId,
        });
    }

    await (targetMember as any).save();

    return targetMember;
}

export async function updateMemberRole({
    ctx,
    communityId,
    userId,
}: {
    ctx: GQLContext;
    communityId: string;
    userId: string;
}): Promise<Membership> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    if (ctx.user.userId === userId) {
        throw new Error(responses.action_not_allowed);
    }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    // const member = await MembershipModel.findOne<Membership>({
    //     domain: ctx.subdomain._id,
    //     userId,
    //     entityId: communityId,
    //     entityType: Constants.MembershipEntityType.COMMUNITY,
    // });
    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.item_not_found);
    }

    const targetMember = await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        userId,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
    });

    if (!targetMember) {
        throw new Error(responses.item_not_found);
    }

    if (targetMember.status !== Constants.MembershipStatus.ACTIVE) {
        throw new Error(responses.cannot_change_role_inactive_member);
    }

    const otherActiveModeratorsCount = await MembershipModel.countDocuments({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        role: Constants.MembershipRole.MODERATE,
        status: Constants.MembershipStatus.ACTIVE,
        userId: { $ne: userId },
    });

    if (otherActiveModeratorsCount === 0) {
        throw new Error(responses.action_not_allowed);
    }

    const nextRole = getNextRoleForCommunityMember(
        targetMember.role as MembershipRole,
    );

    targetMember.role = nextRole;

    await (targetMember as any).save();

    return targetMember;
}

export async function togglePostLike({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        deleted: false,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    let liked = false;
    if (post.likes.includes(ctx.user.userId)) {
        post.likes = post.likes.filter((id) => id !== ctx.user.userId);
    } else {
        post.likes.push(ctx.user.userId);
        liked = true;
    }

    await post.save();

    if (liked && post.userId !== ctx.user.userId) {
        const existingNotification = await NotificationModel.findOne({
            domain: ctx.subdomain._id,
            entityId: post.postId,
            entityAction:
                Constants.NotificationEntityAction.COMMUNITY_POST_LIKED,
            forUserId: post.userId,
            userId: ctx.user.userId,
        });
        if (!existingNotification) {
            await addNotification({
                domain: ctx.subdomain._id.toString(),
                entityId: post.postId,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_POST_LIKED,
                forUserIds: [post.userId],
                userId: ctx.user.userId,
            });
        }
    }

    return formatPost(post, ctx.user.userId);
}

export async function togglePinned({
    ctx,
    communityId,
    postId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
}): Promise<PublicPost> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        deleted: false,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    post.pinned = !post.pinned;

    await post.save();

    return formatPost(post, ctx.user.userId);
}

type PublicComment = Omit<CommunityComment, "user" | "likes"> & {
    userId: string;
};

export async function postComment({
    ctx,
    communityId,
    postId,
    content,
    media,
    parentCommentId,
    parentReplyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    content: string;
    media?: CommunityMedia[];
    parentCommentId?: string;
    parentReplyId?: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = (await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        deleted: false,
    }).lean()) as unknown as CommunityPost;

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.COMMENT)) {
        throw new Error(responses.action_not_allowed);
    }

    let comment;
    if (parentCommentId) {
        comment = await CommunityCommentModel.findOne({
            domain: ctx.subdomain._id,
            communityId,
            postId,
            commentId: parentCommentId,
            deleted: false,
        });

        if (!comment) {
            throw new Error(responses.item_not_found);
        }

        const replyId = generateUniqueId();

        comment.replies.push({
            replyId,
            userId: ctx.user.userId,
            content,
            media,
            parentReplyId,
        });

        await comment.save();

        const postSubscribers = await getPostSubscribersExceptUserId({
            domain: ctx.subdomain._id,
            postId: post.postId,
            userId: ctx.user.userId,
        });

        await addNotification({
            domain: ctx.subdomain._id.toString(),
            entityId: replyId,
            entityAction: Constants.NotificationEntityAction.COMMUNITY_REPLIED,
            forUserIds: postSubscribers.map((s) => s.userId),
            userId: ctx.user.userId,
            entityTargetId: comment.commentId,
        });
    } else {
        comment = await CommunityCommentModel.create({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            communityId,
            postId,
            content,
            media,
        });

        const postSubscribers = await getPostSubscribersExceptUserId({
            domain: ctx.subdomain._id,
            postId: post.postId,
            userId: ctx.user.userId,
        });

        await addNotification({
            domain: ctx.subdomain._id.toString(),
            entityId: post.postId,
            entityAction:
                Constants.NotificationEntityAction.COMMUNITY_COMMENTED,
            forUserIds: postSubscribers.map((s) => s.userId),
            userId: ctx.user.userId,
        });
    }

    await addPostSubscription({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        postId: post.postId,
    });

    return formatComment(comment, ctx.user.userId);
}

export async function getComments({
    ctx,
    communityId,
    postId,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    page?: number;
    limit?: number;
}): Promise<PublicComment[]> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member) {
        return [];
    }

    const comments = await (CommunityCommentModel as any).paginatedFind(
        {
            domain: ctx.subdomain._id,
            communityId,
            postId,
        },
        {
            page,
            limit,
        },
    );

    return comments.map((comment) => formatComment(comment, ctx.user.userId));
}

export async function toggleCommentLike({
    ctx,
    communityId,
    postId,
    commentId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
        deleted: false,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.COMMENT)) {
        throw new Error(responses.action_not_allowed);
    }

    let liked = false;
    if (comment.likes.includes(ctx.user.userId)) {
        comment.likes = comment.likes.filter((id) => id !== ctx.user.userId);
    } else {
        comment.likes.push(ctx.user.userId);
        liked = true;
    }

    await comment.save();

    if (liked && comment.userId !== ctx.user.userId) {
        const existingNotification = await NotificationModel.findOne({
            domain: ctx.subdomain._id,
            entityId: comment.commentId,
            entityAction:
                Constants.NotificationEntityAction.COMMUNITY_COMMENT_LIKED,
            forUserId: comment.userId,
            userId: ctx.user.userId,
        });
        if (!existingNotification) {
            await addNotification({
                domain: ctx.subdomain._id.toString(),
                entityId: comment.commentId,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_COMMENT_LIKED,
                forUserIds: [comment.userId],
                userId: ctx.user.userId,
            });
        }
    }

    return formatComment(comment, ctx.user.userId);
}

export async function toggleCommentReplyLike({
    ctx,
    communityId,
    postId,
    commentId,
    replyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
    replyId: string;
}): Promise<PublicComment> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
        deleted: false,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.COMMENT)) {
        throw new Error(responses.action_not_allowed);
    }

    const reply = comment.replies.find((r) => r.replyId === replyId);

    if (!reply) {
        throw new Error(responses.item_not_found);
    }

    let liked = false;
    if (reply.likes.includes(ctx.user.userId)) {
        reply.likes = reply.likes.filter((id) => id !== ctx.user.userId);
    } else {
        reply.likes.push(ctx.user.userId);
        liked = true;
    }

    await comment.save();

    if (liked && reply.userId !== ctx.user.userId) {
        const existingNotification = await NotificationModel.findOne({
            domain: ctx.subdomain._id,
            entityId: reply.replyId,
            entityAction:
                Constants.NotificationEntityAction.COMMUNITY_REPLY_LIKED,
            forUserId: reply.userId,
            userId: ctx.user.userId,
        });
        if (!existingNotification) {
            await addNotification({
                domain: ctx.subdomain._id.toString(),
                entityId: reply.replyId,
                entityAction:
                    Constants.NotificationEntityAction.COMMUNITY_REPLY_LIKED,
                forUserIds: [reply.userId],
                userId: ctx.user.userId,
                entityTargetId: comment.commentId,
            });
        }
    }

    return formatComment(comment, ctx.user.userId);
}

export async function deleteComment({
    ctx,
    communityId,
    postId,
    commentId,
    replyId,
}: {
    ctx: GQLContext;
    communityId: string;
    postId: string;
    commentId: string;
    replyId?: string;
}): Promise<PublicComment | null> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const post = await CommunityPostModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        deleted: false,
    });

    if (!post) {
        throw new Error(responses.item_not_found);
    }

    let comment = await CommunityCommentModel.findOne({
        domain: ctx.subdomain._id,
        communityId,
        postId,
        commentId,
    });

    if (!comment) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermissionToDelete(member, comment, replyId)) {
        throw new Error(responses.action_not_allowed);
    }

    if (replyId) {
        if (comment.replies.some((r) => r.parentReplyId === replyId)) {
            const replyIndex = comment.replies.findIndex(
                (r) => r.replyId === replyId,
            );
            if (!comment.replies[replyIndex].deleted) {
                comment.replies[replyIndex].deleted = true;
            }
        } else {
            comment.replies = comment.replies.filter(
                (r) => r.replyId !== replyId,
            );
        }
        await comment.save();
    } else {
        if (comment.replies.length) {
            if (!comment.deleted) {
                comment.deleted = true;
                await comment.save();
            }
        } else {
            await comment.deleteOne({
                domain: ctx.subdomain._id,
                communityId,
                postId,
                commentId,
            });
            comment = null;
        }
    }

    // await post.save();

    return comment ? formatComment(comment, ctx.user.userId) : null;
}

export async function leaveCommunity({
    ctx,
    id,
}: {
    ctx: GQLContext;
    id: string;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await MembershipModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        entityId: id,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        status: Constants.MembershipStatus.ACTIVE,
    });

    if (!member) {
        return true;
    }

    if (member.role === Constants.MembershipRole.MODERATE) {
        const otherModeratorsCount = await MembershipModel.countDocuments({
            domain: ctx.subdomain._id,
            entityId: id,
            entityType: Constants.MembershipEntityType.COMMUNITY,
            status: Constants.MembershipStatus.ACTIVE,
            userId: { $ne: ctx.user.userId },
            role: Constants.MembershipRole.MODERATE,
        });

        // const otherMembersWithManageCommunityPermission =
        //     await UserModel.countDocuments({
        //         domain: ctx.subdomain._id,
        //         userId: { $in: otherMembers.map((m) => m.userId) },
        //         permissions: permissions.manageCommunity,
        //     });

        if (otherModeratorsCount === 0) {
            throw new Error(responses.cannot_leave_community_last_moderator);
        }
    }

    if (member.subscriptionId) {
        const paymentMethod = await getPaymentMethodFromSettings(
            ctx.subdomain.settings,
            member.subscriptionMethod,
        );
        await paymentMethod?.cancel(member.subscriptionId);
    }

    if (member.paymentPlanId) {
        await deleteMembershipsActivatedViaPaymentPlan({
            domain: ctx.subdomain._id,
            userId: member.userId,
            paymentPlanId: member.paymentPlanId,
        });
    }

    await member.deleteOne();

    return true;
}

export async function deleteCommunity({
    ctx,
    id,
}: {
    ctx: GQLContext;
    id: string;
}): Promise<Community> {
    checkIfAuthenticated(ctx);

    if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
        throw new Error(responses.action_not_allowed);
    }

    const community = (await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, id),
    ).lean()) as unknown as Community;

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    await CommunityReportModel.deleteMany({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
    });
    await deleteCommunityPostsSubscriptions(community, ctx);
    await deleteCommunityPosts(ctx, "community", community.communityId);
    await deleteMemberships(community, ctx);

    await PageModel.deleteOne({
        domain: ctx.subdomain._id,
        pageId: community.pageId,
        entityId: community.communityId,
    });

    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(community));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        await deleteMedia(mediaId);
    }
    await CommunityModel.deleteOne({
        domain: ctx.subdomain._id,
        communityId: id,
    });

    return await formatCommunity(community, ctx);
}

export async function deleteCommunityPosts(
    ctx: GQLContext,
    by: "community" | "user",
    id: string,
) {
    const query =
        by === "community"
            ? {
                  domain: ctx.subdomain._id,
                  communityId: id,
              }
            : {
                  domain: ctx.subdomain._id,
                  userId: id,
              };
    await CommunityCommentModel.deleteMany(query);
    const mediaTypesToDelete = [
        CommunityMediaTypes.IMAGE,
        CommunityMediaTypes.VIDEO,
        CommunityMediaTypes.GIF,
        CommunityMediaTypes.PDF,
    ];
    const postsWithMedia = await CommunityPostModel.aggregate<{
        media: CommunityMedia[];
    }>([
        {
            $match: {
                ...query,
                "media.type": { $in: mediaTypesToDelete },
            },
        },
        {
            $project: {
                media: {
                    $filter: {
                        input: "$media",
                        as: "media",
                        cond: {
                            $and: [
                                {
                                    $in: ["$$media.type", mediaTypesToDelete],
                                },
                                { $ifNull: ["$$media.media.mediaId", false] },
                            ],
                        },
                    },
                },
            },
        },
    ]);
    for (const post of postsWithMedia) {
        for (const media of post.media) {
            const mediaId = media.media?.mediaId;
            if (mediaId) {
                await deleteMedia(mediaId);
            }
        }
    }
    await CommunityPostModel.deleteMany(query);
}

async function deleteCommunityPostsSubscriptions(
    community: Community,
    ctx: GQLContext,
) {
    const subscriberAggregation = await CommunityPostModel.aggregate([
        {
            $match: {
                domain: ctx.subdomain._id,
                communityId: community.communityId,
            },
        },
        {
            $lookup: {
                from: CommunityPostSubscriberModel.collection.name,
                localField: "postId",
                foreignField: "postId",
                as: "subscribers",
            },
        },
        { $unwind: "$subscribers" },
        {
            $group: {
                _id: null,
                subscriberIds: { $addToSet: "$subscribers._id" },
            },
        },
        {
            $project: {
                _id: 0,
                subscriberIds: 1,
            },
        },
    ]);
    const subscriberIds = subscriberAggregation[0]?.subscriberIds ?? [];
    if (subscriberIds.length > 0) {
        await CommunityPostSubscriberModel.deleteMany({
            _id: { $in: subscriberIds },
        });
    }
}

async function deleteMemberships(community: Community, ctx: GQLContext) {
    const paymentPlans = await PaymentPlanModel.find({
        domain: ctx.subdomain._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
    });

    for (const paymentPlan of paymentPlans) {
        // Delete included products memberships
        if (
            paymentPlan.includedProducts &&
            paymentPlan.includedProducts.length > 0
        ) {
            await ActivityModel.deleteMany({
                domain: ctx.subdomain._id,
                type: constants.activityTypes[0],
                "metadata.isIncludedInPlan": true,
                "metadata.paymentPlanId": paymentPlan.planId,
            });
            await MembershipModel.deleteMany({
                domain: ctx.subdomain._id,
                paymentPlanId: paymentPlan.planId,
                entityType: Constants.MembershipEntityType.COURSE,
                isIncludedInPlan: true,
            });
        }
        const memberships = await MembershipModel.find({
            domain: ctx.subdomain._id,
            paymentPlanId: paymentPlan.planId,
        });
        await cancelAndDeleteMemberships(memberships, ctx);
        await paymentPlan.deleteOne();
    }

    // delete memberships joined via internal payment plan
    const paymentPlan = await getInternalPaymentPlan(ctx);
    await MembershipModel.deleteMany({
        domain: ctx.subdomain._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        paymentPlanId: paymentPlan.planId,
    });
}

export async function cancelAndDeleteMemberships(
    memberships: InternalMembership[],
    ctx: GQLContext,
) {
    for (const membership of memberships) {
        // Cancel active subscriptions
        if (membership.subscriptionId) {
            const paymentMethod = await getPaymentMethodFromSettings(
                ctx.subdomain.settings,
                membership.subscriptionMethod,
            );
            await paymentMethod?.cancel(membership.subscriptionId);
        }

        // Delete associated invoices
        await InvoiceModel.deleteMany({
            domain: ctx.subdomain._id,
            membershipId: membership.membershipId,
        });

        // Delete membership
        await membership.deleteOne();
    }
}

export async function reportCommunityContent({
    communityId,
    contentId,
    type,
    reason,
    ctx,
    contentParentId,
}: {
    communityId: string;
    contentId: string;
    type: CommunityReportType;
    reason: string;
    ctx: GQLContext;
    contentParentId?: string;
}): Promise<CommunityReportPartial> {
    checkIfAuthenticated(ctx);

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member) {
        throw new Error(responses.action_not_allowed);
    }

    const existingReport = await CommunityReportModel.findOne({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        communityId,
        contentId,
    });

    if (existingReport) {
        throw new Error(responses.community_content_already_reported);
    }

    let content: any = undefined;

    if (type === Constants.CommunityReportType.POST) {
        content = await CommunityPostModel.findOne({
            domain: ctx.subdomain._id,
            communityId,
            postId: contentId,
            deleted: false,
        });
    } else if (type === Constants.CommunityReportType.COMMENT) {
        content = await CommunityCommentModel.findOne({
            domain: ctx.subdomain._id,
            communityId,
            commentId: contentId,
            deleted: false,
        });
    } else if (type === Constants.CommunityReportType.REPLY) {
        const comment = await CommunityCommentModel.findOne<CommunityComment>({
            domain: ctx.subdomain._id,
            communityId,
            commentId: contentParentId,
            deleted: false,
        });

        if (!comment) {
            throw new Error(responses.item_not_found);
        }

        content = comment.replies.find((r) => r.replyId === contentId);
    }

    if (!content) {
        throw new Error(responses.item_not_found);
    }

    if (content.userId === ctx.user.userId) {
        throw new Error(responses.action_not_allowed);
    }

    const report = await CommunityReportModel.create({
        domain: ctx.subdomain._id,
        userId: ctx.user.userId,
        communityId,
        contentId,
        type: type.toLowerCase(),
        reason,
        contentParentId,
    });

    return formatCommunityReport(report, ctx);
}

export async function getCommunityReports({
    ctx,
    communityId,
    page = 1,
    limit = 10,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    page?: number;
    limit?: number;
    status?: CommunityReportStatus;
}): Promise<CommunityReportPartial[]> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (status) {
        query.status = status;
    }

    const reports = await (CommunityReportModel as any).paginatedFind(query, {
        page,
        limit,
    });

    return reports.map(async (report) => formatCommunityReport(report, ctx));
}

export async function getCommunityReportsCount({
    ctx,
    communityId,
    status,
}: {
    ctx: GQLContext;
    communityId: string;
    status?: CommunityReportStatus;
}): Promise<number> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    const query: Record<string, unknown> = {
        domain: ctx.subdomain._id,
        communityId,
    };

    if (status) {
        query.status = status;
    }

    const count = await (CommunityReportModel as any).countDocuments(query);

    return count;
}

export async function updateCommunityReportStatus({
    ctx,
    communityId,
    reportId,
    rejectionReason,
}: {
    ctx: GQLContext;
    communityId: string;
    reportId: string;
    rejectionReason?: string;
}): Promise<CommunityReportPartial> {
    checkIfAuthenticated(ctx);

    // if (!checkPermission(ctx.user.permissions, [permissions.manageCommunity])) {
    //     throw new Error(responses.action_not_allowed);
    // }

    const community = await CommunityModel.findOne<InternalCommunity>(
        getCommunityQuery(ctx, communityId),
    );

    if (!community) {
        throw new Error(responses.item_not_found);
    }

    const member = await getMembership(ctx, communityId);

    if (!member || !hasPermission(member, Constants.MembershipRole.MODERATE)) {
        throw new Error(responses.action_not_allowed);
    }

    const report = await CommunityReportModel.findOne<InternalCommunityReport>({
        domain: ctx.subdomain._id,
        communityId,
        reportId,
    });

    if (!report) {
        throw new Error(responses.item_not_found);
    }

    const nextStatus = getNextStatusForCommunityReport(report.status);
    if (nextStatus === Constants.CommunityReportStatus.REJECTED) {
        if (!rejectionReason) {
            throw new Error(responses.rejection_reason_missing);
        }
        report.rejectionReason = rejectionReason;
    } else {
        report.rejectionReason = "";
    }

    report.status = nextStatus;

    await (report as any).save();

    if (report.status === Constants.CommunityReportStatus.ACCEPTED) {
        toggleContentVisibility(report.contentId, report.type, true);
    } else {
        toggleContentVisibility(report.contentId, report.type, false);
    }

    return formatCommunityReport(report, ctx);
}

export async function getCommentsCount(
    post: CommunityPost,
    ctx: GQLContext,
): Promise<number> {
    let commentsCount = 0;

    const comments = (await CommunityCommentModel.find({
        domain: ctx.subdomain._id,
        postId: post.postId,
    }).lean()) as unknown as CommunityComment[];
    for (const comment of comments) {
        if (!comment.deleted) {
            commentsCount += 1;
        }
        for (const reply of comment.replies) {
            if (!reply.deleted) {
                commentsCount += 1;
            }
        }
    }

    return commentsCount;
}
