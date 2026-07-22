import { Constants } from "@courselit/common-models";
import type {
    EmailReplyTokenKind,
    ReplyByEmailContext,
} from "@courselit/common-models";
import mongoose from "mongoose";

export interface InternalEmailReplyToken extends mongoose.Document {
    domain: mongoose.Types.ObjectId;
    token: string;
    userId: string;
    kind: EmailReplyTokenKind;
    community?: ReplyByEmailContext["community"];
    product?: ReplyByEmailContext["product"];
    contextKey: string;
    expiresAt: Date;
    createdAt: Date;
}

const CommunityReplyContextSchema = new mongoose.Schema(
    {
        communityId: { type: String, required: true },
        postId: { type: String, required: true },
        parentCommentId: String,
        parentReplyId: String,
    },
    { _id: false },
);

const ProductReplyContextSchema = new mongoose.Schema(
    {
        productId: { type: String, required: true },
        entityType: {
            type: String,
            required: true,
            enum: Object.values(Constants.ProductDiscussionEntityType),
        },
        entityId: { type: String, required: true },
        commentId: { type: String, required: true },
        parentReplyId: String,
    },
    { _id: false },
);

export const EmailReplyTokenSchema =
    new mongoose.Schema<InternalEmailReplyToken>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            token: { type: String, required: true },
            userId: { type: String, required: true },
            kind: {
                type: String,
                required: true,
                enum: Object.values(Constants.EmailReplyTokenKind),
            },
            community: CommunityReplyContextSchema,
            product: ProductReplyContextSchema,
            contextKey: { type: String, required: true },
            expiresAt: { type: Date, required: true },
        },
        {
            timestamps: { createdAt: true, updatedAt: false },
        },
    );

EmailReplyTokenSchema.index({ token: 1 }, { unique: true });
EmailReplyTokenSchema.index(
    { domain: 1, userId: 1, contextKey: 1 },
    { unique: true },
);
EmailReplyTokenSchema.index({ domain: 1, userId: 1 });
EmailReplyTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
