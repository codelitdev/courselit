import {
    CommunityMedia,
    CommunityPost,
    CommunityReaction,
    CommunityReactionEntityType,
    CommunityReport,
    CommunityReportType,
    COMMUNITY_HEART_EMOJI,
    compareCommunityReactionsStable,
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
import CommunityReactionModel from "@models/CommunityReaction";
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
import {
    extractTextFromTextEditorContent,
    normalizeTextEditorContent,
} from "@courselit/utils";
import UserModel from "@models/User";

export type PublicPost = Omit<
    CommunityPost,
    "createdAt" | "user" | "deleted" | "commentsCount"
> & {
    userId: string;
};

type ReactionRow = {
    entityType: CommunityReactionEntityType;
    entityId: string;
    emoji: string;
    userId: string;
};

/**
 * Convert emoji → userIds map to CommunityReaction[] with reactor details.
 */
export async function formatReactions(
    reactionsMap: Map<string, string[]>,
    userId: string,
): Promise<CommunityReaction[]> {
    const entries: [string, string[]][] = [];
    reactionsMap.forEach((value, key) => {
        if (value.length > 0) {
            entries.push([key, value]);
        }
    });

    if (entries.length === 0) {
        return [];
    }

    const allUserIds = Array.from(new Set(entries.flatMap(([, ids]) => ids)));

    const users = await UserModel.find(
        { userId: { $in: allUserIds } },
        { userId: 1, name: 1, avatar: 1, _id: 0 },
    ).lean();

    const usersById = new Map(users.map((u: any) => [u.userId, u]));

    const reactions: CommunityReaction[] = entries.map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        hasReacted: userIds.includes(userId),
        reactors: userIds.map((id) => {
            const user = usersById.get(id);
            return {
                userId: id,
                name: user?.name,
                avatar: user?.avatar || ({} as any),
            };
        }),
    }));

    // Stable order: fixed picker order (not hasReacted / count) to avoid layout shift
    reactions.sort(compareCommunityReactionsStable);

    return reactions;
}

function heartLikesCount(reactions: CommunityReaction[]): number {
    return reactions.find((r) => r.emoji === COMMUNITY_HEART_EMOJI)?.count ?? 0;
}

function hasHeartReaction(
    reactions: CommunityReaction[],
    userId: string,
): boolean {
    return (
        reactions.find((r) => r.emoji === COMMUNITY_HEART_EMOJI)?.hasReacted ??
        false
    );
}

/**
 * Load and format reactions for a single entity from the reactions collection.
 */
export async function loadReactionsForEntity({
    domain,
    entityType,
    entityId,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    entityType: CommunityReactionEntityType;
    entityId: string;
    userId: string;
}): Promise<CommunityReaction[]> {
    const rows = await CommunityReactionModel.find({
        domain,
        entityType,
        entityId,
    })
        .select({ emoji: 1, userId: 1, _id: 0 })
        .lean();

    const map = new Map<string, string[]>();
    for (const row of rows) {
        const list = map.get(row.emoji) || [];
        list.push(row.userId);
        map.set(row.emoji, list);
    }
    return formatReactions(map, userId);
}

/**
 * Batch-load reactions. Returns Map keyed by `${entityType}:${entityId}`.
 */
export async function loadReactionsForEntities({
    domain,
    filter,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    filter: Record<string, unknown>;
    userId: string;
}): Promise<Map<string, CommunityReaction[]>> {
    const rows = (await CommunityReactionModel.find({
        domain,
        ...filter,
    })
        .select({ entityType: 1, entityId: 1, emoji: 1, userId: 1, _id: 0 })
        .lean()) as ReactionRow[];

    const nested = new Map<string, Map<string, string[]>>();
    for (const row of rows) {
        const key = `${row.entityType}:${row.entityId}`;
        let emojiMap = nested.get(key);
        if (!emojiMap) {
            emojiMap = new Map();
            nested.set(key, emojiMap);
        }
        const users = emojiMap.get(row.emoji) || [];
        users.push(row.userId);
        emojiMap.set(row.emoji, users);
    }

    const result = new Map<string, CommunityReaction[]>();
    // Array.from avoids downlevelIteration requirement for Map iteration.
    for (const [key, emojiMap] of Array.from(nested.entries())) {
        result.set(key, await formatReactions(emojiMap, userId));
    }
    return result;
}

/**
 * Toggle a user's emoji reaction on an entity (insert or delete one row).
 */
export async function toggleCommunityReaction({
    domain,
    communityId,
    entityType,
    entityId,
    postId,
    commentId,
    emoji,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    communityId: string;
    entityType: CommunityReactionEntityType;
    entityId: string;
    postId: string;
    commentId?: string;
    emoji: string;
    userId: string;
}): Promise<{ added: boolean }> {
    const filter = {
        domain,
        entityType,
        entityId,
        userId,
        emoji,
    };

    const existing = await CommunityReactionModel.findOne(filter);
    if (existing) {
        await existing.deleteOne();
        return { added: false };
    }

    try {
        await CommunityReactionModel.create({
            ...filter,
            communityId,
            postId,
            ...(commentId ? { commentId } : {}),
        });
        return { added: true };
    } catch (err: any) {
        // Concurrent double-toggle: unique index → treat as already on, turn off
        if (err?.code === 11000) {
            await CommunityReactionModel.deleteOne(filter);
            return { added: false };
        }
        throw err;
    }
}

export function normalizeCommunityPostContent(
    content: InternalCommunityPost["content"],
): TextEditorContent {
    return normalizeTextEditorContent(content);
}

export const formatComment = async (
    comment: any,
    userId: string,
    domain: mongoose.Types.ObjectId,
) => {
    const commentId = comment.commentId as string;
    const domainId = domain || comment.domain;

    const reactions = await loadReactionsForEntity({
        domain: domainId,
        entityType: Constants.CommunityReactionEntityType.COMMENT,
        entityId: commentId,
        userId,
    });

    const replies = await Promise.all(
        (comment.replies || []).map(async (reply: any) => {
            const replyReactions = await loadReactionsForEntity({
                domain: domainId,
                entityType: Constants.CommunityReactionEntityType.REPLY,
                entityId: reply.replyId,
                userId,
            });
            return {
                replyId: reply.replyId,
                userId: reply.userId,
                content: reply.content,
                media: reply.media,
                parentReplyId: reply.parentReplyId,
                createdAt: reply.createdAt,
                updatedAt: reply.updatedAt,
                likesCount: heartLikesCount(replyReactions),
                hasLiked: hasHeartReaction(replyReactions, userId),
                reactions: replyReactions,
                deleted: reply.deleted,
            };
        }),
    );

    return {
        communityId: comment.communityId,
        postId: comment.postId,
        userId: comment.userId,
        commentId: comment.commentId,
        content: comment.content,
        hasLiked: hasHeartReaction(reactions, userId),
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        media: comment.media,
        likesCount: heartLikesCount(reactions),
        reactions,
        replies,
        deleted: comment.deleted,
    };
};

export const formatPost = async (
    post: InternalCommunityPost | any,
    userId: string,
): Promise<PublicPost> => {
    const domain = post.domain as mongoose.Types.ObjectId;
    const reactions = await loadReactionsForEntity({
        domain,
        entityType: Constants.CommunityReactionEntityType.POST,
        entityId: post.postId,
        userId,
    });

    return {
        communityId: post.communityId,
        postId: post.postId,
        title: post.title,
        content: normalizeCommunityPostContent(post.content),
        category: post.category,
        media: post.media,
        pinned: post.pinned,
        likesCount: heartLikesCount(reactions),
        updatedAt: post.updatedAt,
        hasLiked: hasHeartReaction(reactions, userId),
        reactions,
        userId: post.userId,
    };
};

/** Format many posts (loads reactions per post; simple and correct). */
export async function formatPosts(
    posts: any[],
    userId: string,
    _domain?: mongoose.Types.ObjectId,
): Promise<PublicPost[]> {
    return Promise.all(posts.map((post) => formatPost(post, userId)));
}

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
        content: extractTextFromTextEditorContent(content.content),
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

    await CommunityReactionModel.deleteMany({
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
