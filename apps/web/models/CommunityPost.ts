import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { CommunityPost, TextEditorContent } from "@courselit/common-models";
import CommunityMediaSchema from "./CommunityMedia";

export interface InternalCommunityPost
    extends Omit<
        Pick<
            CommunityPost,
            | "title"
            | "communityId"
            | "postId"
            | "content"
            | "category"
            | "media"
            | "pinned"
            | "deleted"
            | "lessonId"
        >,
        "content"
    > {
    content: TextEditorContent | string;
    domain: mongoose.Types.ObjectId;
    userId: string;
    likes: string[];
    createdAt: string;
    updatedAt: string;
}

const CommunityPostSchema = new mongoose.Schema<InternalCommunityPost>(
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
        content: { type: mongoose.Schema.Types.Mixed, required: true },
        category: String,
        media: [CommunityMediaSchema],
        pinned: { type: Boolean, default: false },
        likes: [String],
        deleted: { type: Boolean, default: false },
        lessonId: { type: String, default: null },
    },
    {
        timestamps: true,
    },
);

CommunityPostSchema.index(
    { domain: 1, communityId: 1, lessonId: 1 },
    {
        unique: true,
        partialFilterExpression: { lessonId: { $type: "string" } },
    },
);
CommunityPostSchema.index({
    domain: 1,
    communityId: 1,
    lessonId: 1,
    deleted: 1,
});
CommunityPostSchema.index({
    domain: 1,
    communityId: 1,
    deleted: 1,
    createdAt: -1,
});
CommunityPostSchema.index({
    domain: 1,
    communityId: 1,
    deleted: 1,
    lessonId: 1,
    createdAt: -1,
});

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

export default mongoose.models.CommunityPost ||
    mongoose.model("CommunityPost", CommunityPostSchema);
