import { TextEditorContent } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export type ProductDiscussionEntityType = "lesson" | "product";
export type ProductDiscussionContentType = "comment" | "reply";
export type ProductDiscussionDeletedByRole = "author" | "course_admin";
export type ProductDiscussionReportStatus = "pending" | "accepted" | "rejected";

interface ProductDiscussionTarget {
    domain: mongoose.Types.ObjectId;
    productId: string;
    entityType: ProductDiscussionEntityType;
    entityId: string;
}

export interface InternalProductDiscussionComment
    extends ProductDiscussionTarget,
        mongoose.Document {
    commentId: string;
    userId: string;
    content: TextEditorContent;
    likesCount: number;
    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    deletedByRole?: ProductDiscussionDeletedByRole;
    deleteReason?: string;
    restoredAt?: Date;
    restoredBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InternalProductDiscussionReply
    extends ProductDiscussionTarget,
        mongoose.Document {
    commentId: string;
    replyId: string;
    parentReplyId?: string;
    userId: string;
    content: TextEditorContent;
    likesCount: number;
    deleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    deletedByRole?: ProductDiscussionDeletedByRole;
    deleteReason?: string;
    restoredAt?: Date;
    restoredBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InternalProductDiscussionLike
    extends ProductDiscussionTarget,
        mongoose.Document {
    contentType: ProductDiscussionContentType;
    contentId: string;
    commentId?: string;
    userId: string;
    createdAt: Date;
}

export interface InternalProductDiscussionSummary
    extends ProductDiscussionTarget,
        mongoose.Document {
    commentsCount: number;
    repliesCount: number;
    totalCount: number;
    activityCountIncludingDeleted: number;
    lastActivityAt: Date;
    lastCommentId?: string;
    lastReplyId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InternalProductDiscussionSubscriber
    extends ProductDiscussionTarget,
        mongoose.Document {
    subscriptionId: string;
    userId: string;
    subscription: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface InternalProductDiscussionReport
    extends ProductDiscussionTarget,
        mongoose.Document {
    reportId: string;
    contentType: ProductDiscussionContentType;
    contentId: string;
    commentId?: string;
    userId: string;
    reason: string;
    status: ProductDiscussionReportStatus;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const targetFields = {
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    productId: { type: String, required: true },
    entityType: {
        type: String,
        required: true,
        enum: ["lesson", "product"],
    },
    entityId: { type: String, required: true },
};

const contentField = {
    type: mongoose.Schema.Types.Mixed,
    required: true,
};

export const ProductDiscussionCommentSchema =
    new mongoose.Schema<InternalProductDiscussionComment>(
        {
            ...targetFields,
            commentId: {
                type: String,
                required: true,
                default: generateUniqueId,
            },
            userId: { type: String, required: true },
            content: contentField,
            likesCount: { type: Number, required: true, default: 0 },
            deleted: { type: Boolean, required: true, default: false },
            deletedAt: Date,
            deletedBy: String,
            deletedByRole: {
                type: String,
                enum: ["author", "course_admin"],
            },
            deleteReason: String,
            restoredAt: Date,
            restoredBy: String,
        },
        {
            timestamps: true,
        },
    );

ProductDiscussionCommentSchema.index(
    { domain: 1, commentId: 1 },
    { unique: true },
);
ProductDiscussionCommentSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    createdAt: -1,
    commentId: -1,
});
ProductDiscussionCommentSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    updatedAt: -1,
});
ProductDiscussionCommentSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    userId: 1,
    deleted: 1,
});

export const ProductDiscussionReplySchema =
    new mongoose.Schema<InternalProductDiscussionReply>(
        {
            ...targetFields,
            commentId: { type: String, required: true },
            replyId: {
                type: String,
                required: true,
                default: generateUniqueId,
            },
            parentReplyId: String,
            userId: { type: String, required: true },
            content: contentField,
            likesCount: { type: Number, required: true, default: 0 },
            deleted: { type: Boolean, required: true, default: false },
            deletedAt: Date,
            deletedBy: String,
            deletedByRole: {
                type: String,
                enum: ["author", "course_admin"],
            },
            deleteReason: String,
            restoredAt: Date,
            restoredBy: String,
        },
        {
            timestamps: true,
        },
    );

ProductDiscussionReplySchema.index({ domain: 1, replyId: 1 }, { unique: true });
ProductDiscussionReplySchema.index({
    domain: 1,
    commentId: 1,
    createdAt: 1,
    replyId: 1,
});
ProductDiscussionReplySchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    createdAt: -1,
    replyId: -1,
});
ProductDiscussionReplySchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    userId: 1,
    deleted: 1,
});

export const ProductDiscussionLikeSchema =
    new mongoose.Schema<InternalProductDiscussionLike>(
        {
            ...targetFields,
            contentType: {
                type: String,
                required: true,
                enum: ["comment", "reply"],
            },
            contentId: { type: String, required: true },
            commentId: String,
            userId: { type: String, required: true },
        },
        {
            timestamps: { createdAt: true, updatedAt: false },
        },
    );

ProductDiscussionLikeSchema.index(
    { domain: 1, contentType: 1, contentId: 1, userId: 1 },
    { unique: true },
);
ProductDiscussionLikeSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    userId: 1,
});
ProductDiscussionLikeSchema.index({
    domain: 1,
    contentType: 1,
    contentId: 1,
});

export const ProductDiscussionSummarySchema =
    new mongoose.Schema<InternalProductDiscussionSummary>(
        {
            ...targetFields,
            commentsCount: { type: Number, required: true, default: 0 },
            repliesCount: { type: Number, required: true, default: 0 },
            totalCount: { type: Number, required: true, default: 0 },
            activityCountIncludingDeleted: {
                type: Number,
                required: true,
                default: 0,
            },
            lastActivityAt: { type: Date, required: true },
            lastCommentId: String,
            lastReplyId: String,
        },
        {
            timestamps: true,
        },
    );

ProductDiscussionSummarySchema.index(
    { domain: 1, productId: 1, entityType: 1, entityId: 1 },
    { unique: true },
);
ProductDiscussionSummarySchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    lastActivityAt: -1,
    entityId: 1,
});

export const ProductDiscussionSubscriberSchema =
    new mongoose.Schema<InternalProductDiscussionSubscriber>(
        {
            ...targetFields,
            subscriptionId: {
                type: String,
                required: true,
                default: generateUniqueId,
            },
            userId: { type: String, required: true },
            subscription: { type: Boolean, required: true, default: true },
        },
        {
            timestamps: true,
        },
    );

ProductDiscussionSubscriberSchema.index(
    { domain: 1, productId: 1, entityType: 1, entityId: 1, userId: 1 },
    { unique: true },
);
ProductDiscussionSubscriberSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    subscription: 1,
    userId: 1,
});

export const ProductDiscussionReportSchema =
    new mongoose.Schema<InternalProductDiscussionReport>(
        {
            ...targetFields,
            reportId: {
                type: String,
                required: true,
                default: generateUniqueId,
            },
            contentType: {
                type: String,
                required: true,
                enum: ["comment", "reply"],
            },
            contentId: { type: String, required: true },
            commentId: String,
            userId: { type: String, required: true },
            reason: { type: String, required: true },
            status: {
                type: String,
                required: true,
                enum: ["pending", "accepted", "rejected"],
                default: "pending",
            },
            rejectionReason: String,
        },
        {
            timestamps: true,
        },
    );

ProductDiscussionReportSchema.index(
    { domain: 1, contentType: 1, contentId: 1, userId: 1 },
    { unique: true },
);
ProductDiscussionReportSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
    status: 1,
    createdAt: -1,
    reportId: -1,
});
ProductDiscussionReportSchema.index({
    domain: 1,
    productId: 1,
    entityType: 1,
    entityId: 1,
});
