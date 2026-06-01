import {
    Community,
    CommunityMedia,
    CommunityPost,
    CommunityReport,
    CommunityReportType,
    CommunityMediaTypes,
    Constants,
    Membership,
    TextEditorContent,
} from "@courselit/common-models";
import constants from "@/config/constants";
import CommunityCommentModel, {
    InternalCommunityComment,
} from "@models/CommunityComment";
import CommunityPostModel, {
    InternalCommunityPost,
} from "@models/CommunityPost";
import CommunityModel from "@models/Community";
import GQLContext from "@models/GQLContext";
import { deleteMedia } from "@/services/medialit";
import { responses } from "@/config/strings";
import MembershipModel from "@models/Membership";
import { error } from "@/services/logger";
import mongoose from "mongoose";
import CommunityReportModel, {
    InternalCommunityReport,
} from "@models/CommunityReport";
import CommunityPostSubscriberModel, {
    CommunityPostSubscriber,
} from "@models/CommunityPostSubscriber";
import { hasCommunityPermission } from "@ui-lib/utils";
import { extractMediaIDs, normalizeTextEditorContent } from "@courselit/utils";
import PageModel from "@models/Page";
import PaymentPlanModel from "@models/PaymentPlan";
import InvoiceModel from "@models/Invoice";
import ActivityModel from "@models/Activity";
import NotificationModel from "@models/Notification";
import { InternalMembership } from "@courselit/orm-models";
import { getInternalPaymentPlan } from "../paymentplans/logic";
import { getPaymentMethodFromSettings } from "@/payments-new";

export type PublicPost = Omit<
    CommunityPost,
    "createdAt" | "user" | "deleted" | "commentsCount"
> & {
    userId: string;
};

export function normalizeCommunityPostContent(
    content: InternalCommunityPost["content"],
): TextEditorContent {
    return normalizeTextEditorContent(content);
}

export const formatComment = (comment: any, userId: string) => ({
    communityId: comment.communityId,
    postId: comment.postId,
    userId: comment.userId,
    commentId: comment.commentId,
    content: comment.content,
    hasLiked: comment.likes.includes(userId),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    media: comment.media,
    likesCount: comment.likes.length,
    replies: comment.replies.map((reply) => ({
        replyId: reply.replyId,
        userId: reply.userId,
        content: reply.content,
        media: reply.media,
        parentReplyId: reply.parentReplyId,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        likesCount: reply.likes.length,
        hasLiked: reply.likes.includes(userId),
        deleted: reply.deleted,
    })),
    deleted: comment.deleted,
});

export const formatPost = (
    post: InternalCommunityPost,
    userId: string,
): PublicPost => ({
    communityId: post.communityId,
    postId: post.postId,
    title: post.title,
    content: normalizeCommunityPostContent(post.content),
    category: post.category,
    media: post.media,
    pinned: post.pinned,
    likesCount: post.likes.length,
    updatedAt: post.updatedAt,
    hasLiked: post.likes.includes(userId),
    userId: post.userId,
});

export async function toggleContentVisibility(
    contentId: string,
    type: string,
    visible: boolean,
) {
    if (type === Constants.CommunityReportType.POST) {
        await CommunityPostModel.updateOne(
            { postId: contentId },
            { $set: { deleted: visible } },
        );
    } else if (type === Constants.CommunityReportType.COMMENT) {
        await CommunityCommentModel.updateOne(
            { commentId: contentId },
            { $set: { deleted: visible } },
        );
    } else if (type === Constants.CommunityReportType.REPLY) {
        await CommunityCommentModel.updateOne(
            { "replies.replyId": contentId },
            { $set: { "replies.$.deleted": visible } },
        );
    } else {
        throw new Error("Invalid content type");
    }
}

export async function getCommunityReportContent({
    domain,
    communityId,
    type,
    contentId,
    contentParentId,
}: {
    domain: mongoose.Types.ObjectId;
    communityId: string;
    type: CommunityReportType;
    contentId: string;
    contentParentId?: string;
}): Promise<{
    content: string;
    id: string;
    media: CommunityMedia[];
}> {
    let content: any = undefined;

    if (type === Constants.CommunityReportType.POST) {
        content = await CommunityPostModel.findOne({
            domain,
            communityId,
            postId: contentId,
        });
    } else if (type === Constants.CommunityReportType.COMMENT) {
        content = await CommunityCommentModel.findOne({
            domain,
            communityId,
            commentId: contentId,
        });
    } else if (type === Constants.CommunityReportType.REPLY) {
        const comment = await CommunityCommentModel.findOne({
            domain,
            communityId,
            commentId: contentParentId,
        });

        if (!comment) {
            throw new Error(responses.item_not_found);
        }

        content = comment.replies.find((r) => r.replyId === contentId);
    }

    if (!content) {
        throw new Error(responses.item_not_found);
    }

    return {
        content: content.content,
        id: contentId,
        media: content.media,
    };
}

export async function deleteCommunityData(
    ctx: GQLContext,
    communityId: string,
) {
    await CommunityCommentModel.deleteMany({
        domain: ctx.subdomain._id,
        communityId,
    });

    const posts = await CommunityPostModel.find<CommunityPost>({
        domain: ctx.subdomain._id,
        communityId,
    });

    for (const post of posts) {
        if (post.media) {
            for (const media of post.media) {
                if (media.media) {
                    try {
                        await deleteMedia(media.media.mediaId);
                    } catch (err) {
                        error(err.message, {
                            stack: err.stack,
                        });
                    }
                }
            }
        }
    }

    await CommunityPostModel.deleteMany({
        domain: ctx.subdomain._id,
        communityId,
    });

    await MembershipModel.deleteMany({
        domain: ctx.subdomain._id,
        entityId: communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
    });
}

export async function deleteCommunityInternal({
    ctx,
    community,
}: {
    ctx: GQLContext;
    community: Pick<Community, "communityId"> & Partial<Community>;
}) {
    const posts = await CommunityPostModel.find(
        {
            domain: ctx.subdomain._id,
            communityId: community.communityId,
        },
        { postId: 1 },
    ).lean<{ postId: string }[]>();
    const postIds = posts.map((post) => post.postId);
    const comments = await CommunityCommentModel.find(
        {
            domain: ctx.subdomain._id,
            communityId: community.communityId,
        },
        { commentId: 1, replies: 1 },
    ).lean<{ commentId: string; replies?: { replyId: string }[] }[]>();
    const commentIds = comments.map((comment) => comment.commentId);
    const replyIds = comments.flatMap((comment) =>
        (comment.replies || []).map((reply) => reply.replyId),
    );
    const contentIds = [
        community.communityId,
        ...postIds,
        ...commentIds,
        ...replyIds,
    ];

    await NotificationModel.deleteMany({
        domain: ctx.subdomain._id,
        $or: [
            { entityId: { $in: contentIds } },
            { entityTargetId: { $in: contentIds } },
            { "metadata.communityId": community.communityId },
            { "metadata.postId": { $in: postIds } },
            { "metadata.commentId": { $in: commentIds } },
        ],
    });
    await ActivityModel.deleteMany({
        domain: ctx.subdomain._id,
        $or: [
            { entityId: { $in: contentIds } },
            { "metadata.communityId": community.communityId },
            { "metadata.postId": { $in: postIds } },
            { "metadata.commentId": { $in: commentIds } },
        ],
    });
    await CommunityReportModel.deleteMany({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
    });
    await deleteCommunityPostsSubscriptions(community, ctx);
    await deleteCommunityPosts(ctx, "community", community.communityId);
    await deleteMemberships(community, ctx);

    if (community.pageId) {
        await PageModel.deleteOne({
            domain: ctx.subdomain._id,
            pageId: community.pageId,
            entityId: community.communityId,
        });
    }

    const mediaToBeDeleted = extractMediaIDs(JSON.stringify(community));
    for (const mediaId of Array.from(mediaToBeDeleted)) {
        await deleteMedia(mediaId);
    }

    await CommunityModel.deleteOne({
        domain: ctx.subdomain._id,
        communityId: community.communityId,
    });
}

async function deleteMemberships(
    community: Pick<Community, "communityId">,
    ctx: GQLContext,
) {
    const paymentPlans = await PaymentPlanModel.find({
        domain: ctx.subdomain._id,
        entityId: community.communityId,
        entityType: Constants.MembershipEntityType.COMMUNITY,
        internal: false,
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

export async function deleteCommunityPosts(
    ctx: Pick<GQLContext, "subdomain">,
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
    community: Pick<Community, "communityId">,
    ctx: Pick<GQLContext, "subdomain">,
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

export function hasPermissionToDelete(
    membership: Membership,
    comment: InternalCommunityComment,
    replyId,
) {
    const ownerUserId = replyId
        ? comment.replies.find((r) => r.replyId === replyId)?.userId
        : comment.userId;
    return (
        membership.userId === ownerUserId ||
        hasCommunityPermission(membership, Constants.MembershipRole.MODERATE)
    );
}

export type CommunityReportPartial = Omit<CommunityReport, "user"> & {
    userId: string;
};

export async function formatCommunityReport(
    report: InternalCommunityReport,
    ctx: GQLContext,
): Promise<CommunityReportPartial> {
    const content = await getCommunityReportContent({
        domain: ctx.subdomain._id,
        communityId: report.communityId,
        type: report.type,
        contentId: report.contentId,
        contentParentId: report.contentParentId,
    });

    return {
        reportId: report.reportId,
        userId: report.userId,
        communityId: report.communityId,
        content,
        type: report.type,
        reason: report.reason,
        status: report.status,
        rejectionReason: report.rejectionReason,
    };
}

export async function addPostSubscription({
    domain,
    userId,
    postId,
    session,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    postId: string;
    session?: mongoose.ClientSession;
}) {
    const existingSubscriptionQuery = CommunityPostSubscriberModel.findOne({
        domain,
        userId,
        postId,
    });
    if (session) {
        existingSubscriptionQuery.session(session);
    }
    const existingSubscription = await existingSubscriptionQuery;

    if (!existingSubscription) {
        const subscription = new CommunityPostSubscriberModel({
            domain,
            userId,
            postId,
        });
        await subscription.save({ session });
    }
}

export async function getPostSubscribersExceptUserId({
    domain,
    userId,
    postId,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    postId: string;
}): Promise<CommunityPostSubscriber[]> {
    return await CommunityPostSubscriberModel.find({
        domain,
        postId,
        userId: { $nin: [userId] },
    });
}
