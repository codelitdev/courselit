import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { CommunityMediaSchema } from "./community-media";
import {
    CommunityComment,
    CommunityCommentReply,
} from "@courselit/common-models";

export interface InternalCommunityComment
    extends Pick<
        CommunityComment,
        "communityId" | "postId" | "commentId" | "content" | "media"
    > {
    domain: mongoose.Types.ObjectId;
    userId: string;
    replies: InternalReply[];
    deleted: boolean;
}

export interface InternalReply
    extends Omit<
        CommunityCommentReply,
        "likesCount" | "hasLiked" | "reactions"
    > {
    userId: string;
}

export const ReplySchema = new mongoose.Schema(
    {
        userId: { type: String, required: true },
        content: { type: String, required: true },
        media: [CommunityMediaSchema],
        replyId: { type: String, required: true, default: generateUniqueId },
        parentReplyId: { type: String, default: null },
        deleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

export const CommunityCommentSchema =
    new mongoose.Schema<InternalCommunityComment>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            userId: { type: String, required: true },
            communityId: { type: String, required: true },
            postId: { type: String, required: true },
            commentId: {
                type: String,
                required: true,
                unique: true,
                default: generateUniqueId,
            },
            content: { type: String, required: true },
            media: [CommunityMediaSchema],
            replies: [ReplySchema],
            deleted: { type: Boolean, required: true, default: false },
        },
        {
            timestamps: true,
        },
    );

CommunityCommentSchema.statics.paginatedFind = async function (
    filter,
    options,
) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
    return docs;
};
