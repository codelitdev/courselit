import { Media } from "./media";
import { CommunityReactionEntityType as CommunityReactionEntityTypeConst } from "./constants";

/** Heart reaction — legacy "likes" map to this emoji. */
export const COMMUNITY_HEART_EMOJI = "❤️";

/** Allowed reaction emojis for community posts/comments/replies. */
export const COMMUNITY_REACTION_EMOJIS = [
    "👍",
    COMMUNITY_HEART_EMOJI,
    "😄",
    "🎉",
    "😢",
    "😮",
] as const;

export type CommunityReactionEmoji = (typeof COMMUNITY_REACTION_EMOJIS)[number];

export function isAllowedCommunityReactionEmoji(
    emoji: string,
): emoji is CommunityReactionEmoji {
    return (COMMUNITY_REACTION_EMOJIS as readonly string[]).includes(emoji);
}

/**
 * Stable display order for reaction pills: fixed picker order, then unknowns.
 * Avoids layout shift when the current user reacts (does not promote hasReacted).
 */
export function compareCommunityReactionsStable(
    a: { emoji: string },
    b: { emoji: string },
): number {
    const order = COMMUNITY_REACTION_EMOJIS as readonly string[];
    const ai = order.indexOf(a.emoji);
    const bi = order.indexOf(b.emoji);
    if (ai === -1 && bi === -1) return a.emoji.localeCompare(b.emoji);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
}

export type CommunityReactionEntityType =
    (typeof CommunityReactionEntityTypeConst)[keyof typeof CommunityReactionEntityTypeConst];

/**
 * Aggregated reaction group for API/UI (per emoji on one entity).
 */
export interface CommunityReaction {
    emoji: string;
    count: number;
    hasReacted: boolean;
    reactors: {
        userId: string;
        name?: string;
        avatar: Media;
    }[];
}

/**
 * One row in the communityreactions collection:
 * one user × one emoji × one entity.
 */
export interface CommunityReactionRecord {
    communityId: string;
    entityType: CommunityReactionEntityType;
    entityId: string;
    postId: string;
    commentId?: string;
    emoji: string;
    userId: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
