import mongoose from "mongoose";
import {
    CommunityCommentSchema,
    CommunityPostSchema,
    CommunitySchema,
    CourseSchema,
    ProductDiscussionCommentSchema,
    ProductDiscussionReplySchema,
} from "@courselit/orm-models";
import type { ProductDiscussionEntityType } from "@courselit/common-models";
import type { NotificationEntityResolver } from "./get-notification-message-and-href";

export interface CreateNotificationEntityResolverOptions {
    domainId?: unknown;
}

export function createNotificationEntityResolver(
    options: CreateNotificationEntityResolverOptions = {},
): NotificationEntityResolver {
    const defaultDomainId = options.domainId;

    return {
        async getCommunity(communityId, domainId) {
            return await getCommunityModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        communityId,
                    },
                    {
                        _id: 0,
                        communityId: 1,
                        name: 1,
                    },
                )
                .lean<{ communityId: string; name: string } | null>();
        },
        async getPost(postId, domainId) {
            return await getCommunityPostModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        postId,
                        deleted: false,
                    },
                    {
                        _id: 0,
                        postId: 1,
                        title: 1,
                        userId: 1,
                        communityId: 1,
                        content: 1,
                    },
                )
                .lean<{
                    postId: string;
                    title: string;
                    userId: string;
                    communityId: string;
                    content?: unknown;
                } | null>();
        },
        async getComment(commentId, domainId) {
            const comment = await getCommunityCommentModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        commentId,
                        deleted: false,
                    },
                    {
                        _id: 0,
                        commentId: 1,
                        userId: 1,
                        content: 1,
                        postId: 1,
                        communityId: 1,
                        replies: 1,
                    },
                )
                .lean<{
                    commentId: string;
                    userId: string;
                    content: string;
                    postId: string;
                    communityId: string;
                    replies?: Array<{
                        replyId: string;
                        userId: string;
                        content: string;
                        parentReplyId?: string;
                        deleted?: boolean;
                    }>;
                } | null>();

            if (!comment) {
                return null;
            }

            return {
                commentId: comment.commentId,
                userId: comment.userId,
                content: comment.content,
                postId: comment.postId,
                communityId: comment.communityId,
                replies: (comment.replies || [])
                    .filter((reply) => !reply.deleted)
                    .map((reply) => ({
                        replyId: reply.replyId,
                        userId: reply.userId,
                        content: reply.content,
                        parentReplyId: reply.parentReplyId,
                    })),
            };
        },
        async getCourse(courseId, domainId) {
            return await getCourseModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        courseId,
                    },
                    {
                        _id: 0,
                        courseId: 1,
                        title: 1,
                        slug: 1,
                        creatorId: 1,
                    },
                )
                .lean<{
                    courseId: string;
                    title: string;
                    slug?: string;
                    creatorId?: string;
                } | null>();
        },
        async getDiscussionComment(commentId, domainId) {
            return await getProductDiscussionCommentModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        commentId,
                        deleted: false,
                    },
                    {
                        _id: 0,
                        commentId: 1,
                        userId: 1,
                        productId: 1,
                        entityType: 1,
                        entityId: 1,
                        content: 1,
                    },
                )
                .lean<{
                    commentId: string;
                    userId: string;
                    productId: string;
                    entityType: ProductDiscussionEntityType;
                    entityId: string;
                    content: unknown;
                } | null>();
        },
        async getDiscussionReply(replyId, domainId) {
            return await getProductDiscussionReplyModel()
                .findOne(
                    {
                        ...getDomainQuery(domainId ?? defaultDomainId),
                        replyId,
                        deleted: false,
                    },
                    {
                        _id: 0,
                        replyId: 1,
                        commentId: 1,
                        parentReplyId: 1,
                        userId: 1,
                        productId: 1,
                        entityType: 1,
                        entityId: 1,
                        content: 1,
                    },
                )
                .lean<{
                    replyId: string;
                    commentId: string;
                    parentReplyId?: string;
                    userId: string;
                    productId: string;
                    entityType: ProductDiscussionEntityType;
                    entityId: string;
                    content: unknown;
                } | null>();
        },
    };
}

function getDomainQuery(domainId?: unknown): Record<string, unknown> {
    if (!domainId) {
        return {};
    }

    return {
        domain: domainId,
    };
}

function getCommunityModel(): mongoose.Model<any> {
    return (mongoose.models.Community ||
        mongoose.model("Community", CommunitySchema)) as mongoose.Model<any>;
}

function getCommunityPostModel(): mongoose.Model<any> {
    return (mongoose.models.CommunityPost ||
        mongoose.model(
            "CommunityPost",
            CommunityPostSchema,
        )) as mongoose.Model<any>;
}

function getCommunityCommentModel(): mongoose.Model<any> {
    return (mongoose.models.CommunityComment ||
        mongoose.model(
            "CommunityComment",
            CommunityCommentSchema,
        )) as mongoose.Model<any>;
}

function getCourseModel(): mongoose.Model<any> {
    return (mongoose.models.Course ||
        mongoose.model("Course", CourseSchema)) as mongoose.Model<any>;
}

function getProductDiscussionCommentModel(): mongoose.Model<any> {
    return (mongoose.models.ProductDiscussionComment ||
        mongoose.model(
            "ProductDiscussionComment",
            ProductDiscussionCommentSchema,
        )) as mongoose.Model<any>;
}

function getProductDiscussionReplyModel(): mongoose.Model<any> {
    return (mongoose.models.ProductDiscussionReply ||
        mongoose.model(
            "ProductDiscussionReply",
            ProductDiscussionReplySchema,
        )) as mongoose.Model<any>;
}
