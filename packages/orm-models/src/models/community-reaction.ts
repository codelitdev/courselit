import {
    CommunityReactionEntityType,
    Constants,
} from "@courselit/common-models";
import mongoose from "mongoose";

export interface InternalCommunityReaction {
    domain: mongoose.Types.ObjectId;
    communityId: string;
    entityType: CommunityReactionEntityType;
    entityId: string;
    postId: string;
    commentId?: string;
    emoji: string;
    userId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export const CommunityReactionSchema =
    new mongoose.Schema<InternalCommunityReaction>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            communityId: { type: String, required: true },
            entityType: {
                type: String,
                required: true,
                enum: Object.values(Constants.CommunityReactionEntityType),
            },
            entityId: { type: String, required: true },
            postId: { type: String, required: true },
            commentId: { type: String },
            emoji: { type: String, required: true },
            userId: { type: String, required: true },
        },
        {
            timestamps: true,
        },
    );

// One reaction per user per emoji per entity
CommunityReactionSchema.index(
    { domain: 1, entityType: 1, entityId: 1, userId: 1, emoji: 1 },
    { unique: true },
);
// Load reactions for an entity
CommunityReactionSchema.index({ domain: 1, entityType: 1, entityId: 1 });
// All reactions in a post thread
CommunityReactionSchema.index({ domain: 1, postId: 1 });
// User cleanup / "my reactions"
CommunityReactionSchema.index({ domain: 1, userId: 1 });
// Community-scoped queries
CommunityReactionSchema.index({ domain: 1, communityId: 1, createdAt: -1 });
