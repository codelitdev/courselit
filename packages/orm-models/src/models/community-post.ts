import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { CommunityPost } from "@courselit/common-models";
import { CommunityMediaSchema } from "./community-media";

export interface InternalCommunityPost
    extends Pick<
        CommunityPost,
        | "title"
        | "communityId"
        | "postId"
        | "content"
        | "category"
        | "media"
        | "pinned"
        | "deleted"
    > {
    domain: mongoose.Types.ObjectId;
    userId: string;
    likes: string[];
    createdAt: string;
    updatedAt: string;
}

export const CommunityPostSchema = new mongoose.Schema<InternalCommunityPost>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        communityId: { type: String, required: true },
        postId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        title: { type: String, required: true },
        content: { type: String, required: true },
        category: String,
        media: [CommunityMediaSchema],
        pinned: { type: Boolean, default: false },
        likes: [String],
        deleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

CommunityPostSchema.statics.paginatedFind = async function (filter, options) {
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
