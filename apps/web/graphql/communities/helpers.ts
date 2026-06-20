import {
    CommunityMedia,
    CommunityPost,
    CommunityReaction,
    CommunityReport,
    CommunityReportType,
    Constants,
    Membership,
    TextEditorContent,
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
import { normalizeTextEditorContent } from "@courselit/utils";
import UserModel from "@models/User";

export type PublicPost = Omit<
    CommunityPost,
    "createdAt" | "user" | "deleted" | "commentsCount"
> & {
    userId: string;
};

const HEART_EMOJI = "❤️";

/**
 * Get reactions from an entity that may have either `reactions` (Map) or legacy `likes` (string[]).
 * Returns a Map<string, string[]>.
 */
function getReactionsMap(entity: any): Map<string, string[]> {
    if (entity.reactions && typeof entity.reactions === "object") {
        // New format: reactions is a Map or object
        if (entity.reactions instanceof Map) {
            if (entity.reactions.size > 0) {
                return entity.reactions;
            }
        } else {
            // Plain object from lean() / serialization
            const entries = Object.entries(entity.reactions);
            if (entries.length > 0) {
                return new Map(entries);
            }
        }
    }
    // Legacy format: likes is a string[]
    if (Array.isArray(entity.likes) && entity.likes.length > 0) {
        return new Map([[HEART_EMOJI, [...entity.likes]]]);
    }
    return new Map();
}

/**
 * Convert a Map<string, string[]> to a CommunityReaction[] array with reactor details.
 */
export async function formatReactions(
    reactionsMap: Map<string, string[]>,
    userId: string,
): Promise<CommunityReaction[]> {
    const reactions: CommunityReaction[] = [];

    const entries: [string, string[]][] = [];
    reactionsMap.forEach((value, key) => {
        entries.push([key, value]);
    });

    for (let i = 0; i < entries.length; i++) {
        const [emoji, userIds] = entries[i];
        if (userIds.length === 0) continue;

        const reactors = await UserModel.find(
            { userId: { $in: userIds } },
            { userId: 1, name: 1, avatar: 1, _id: 0 },
        ).lean();

        reactions.push({
            emoji,
            count: userIds.length,
            hasReacted: userIds.includes(userId),
            reactors: reactors.map((r: any) => ({
                userId: r.userId,
                name: r.name,
                avatar: r.avatar || {},
            })),
        });
    }

    // Sort reactions: user's reactions first, then by count descending
    reactions.sort((a, b) => {
        if (a.hasReacted !== b.hasReacted) return a.hasReacted ? -1 : 1;
        return b.count - a.count;
    });

    return reactions;
}

/**
 * Compute likesCount from reactions (sum of all reaction counts for backward compat).
 */
function computeLikesCount(reactionsMap: Map<string, string[]>): number {
    let count = 0;
    reactionsMap.forEach(function (userIds: string[]) {
        count += userIds.length;
    });
    return count;
}

/**
 * Compute hasLiked from reactions (user is in any reaction).
 */
function computeHasLiked(
    reactionsMap: Map<string, string[]>,
    userId: string,
): boolean {
    let found = false;
    reactionsMap.forEach(function (userIds: string[]) {
        if (userIds.includes(userId)) found = true;
    });
    return found;
}

export function normalizeCommunityPostContent(
    content: InternalCommunityPost["content"],
): TextEditorContent {
    return normalizeTextEditorContent(content);
}

export const formatComment = (comment: any, userId: string) => {
    const reactionsMap = getReactionsMap(comment);
    return {
        communityId: comment.communityId,
        postId: comment.postId,
        userId: comment.userId,
        commentId: comment.commentId,
        content: comment.content,
        hasLiked: computeHasLiked(reactionsMap, userId),
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        media: comment.media,
        likesCount: computeLikesCount(reactionsMap),
        reactions: [], // Populated by resolver with user details
        replies: comment.replies.map((reply: any) => {
            const replyReactionsMap = getReactionsMap(reply);
            return {
                replyId: reply.replyId,
                userId: reply.userId,
                content: reply.content,
                media: reply.media,
                parentReplyId: reply.parentReplyId,
                createdAt: reply.createdAt,
                updatedAt: reply.updatedAt,
                likesCount: computeLikesCount(replyReactionsMap),
                hasLiked: computeHasLiked(replyReactionsMap, userId),
                reactions: [], // Populated by resolver
                deleted: reply.deleted,
            };
        }),
        deleted: comment.deleted,
    };
};

export const formatPost = (
    post: InternalCommunityPost,
    userId: string,
): PublicPost => {
    const reactionsMap = getReactionsMap(post);
    return {
        communityId: post.communityId,
        postId: post.postId,
        title: post.title,
        content: normalizeCommunityPostContent(post.content),
        category: post.category,
        media: post.media,
        pinned: post.pinned,
        likesCount: computeLikesCount(reactionsMap),
        updatedAt: post.updatedAt,
        hasLiked: computeHasLiked(reactionsMap, userId),
        reactions: [], // Populated by resolver with user details
        userId: post.userId,
    };
};

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
