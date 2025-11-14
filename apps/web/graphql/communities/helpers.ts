import {
    CommunityMedia,
    CommunityPost,
    CommunityReport,
    CommunityReportType,
    Constants,
    Membership,
} from "@courselit/common-models";
import CommunityCommentModel, {
    InternalCommunityComment,
} from "@models/CommunityComment";
import CommunityPostModel, {
    InternalCommunityPost,
} from "@models/CommunityPost";
import GQLContext from "@models/GQLContext";
import { deleteMedia } from "@/services/medialit";
import { responses } from "@/config/strings";
import MembershipModel from "@models/Membership";
import { error } from "@/services/logger";
import mongoose from "mongoose";
import { InternalCommunityReport } from "@models/CommunityReport";
import CommunityPostSubscriberModel, {
    CommunityPostSubscriber,
} from "@models/CommunityPostSubscriber";
import { hasCommunityPermission } from "@ui-lib/utils";

export type PublicPost = Omit<
    CommunityPost,
    "createdAt" | "user" | "deleted" | "commentsCount"
> & {
    userId: string;
};

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
    content: post.content,
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
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
    postId: string;
}) {
    const existingSubscription = await CommunityPostSubscriberModel.findOne({
        domain,
        userId,
        postId,
    });

    if (!existingSubscription) {
        await CommunityPostSubscriberModel.create({
            domain,
            userId,
            postId,
        });
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
