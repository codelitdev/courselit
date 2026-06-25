import {
    GraphQLBoolean,
    GraphQLEnumType,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import LessonModel from "@/models/Lesson";
import ProductDiscussionCommentModel from "@/models/ProductDiscussionComment";
import ProductDiscussionLikeModel from "@/models/ProductDiscussionLike";
import ProductDiscussionReplyModel from "@/models/ProductDiscussionReply";
import UserModel from "@/models/User";
import userTypes from "../users/types";
import { extractTextFromTextEditorContent } from "@courselit/utils";
import { Constants } from "@courselit/common-models";
const {
    ProductDiscussionEntityType,
    ProductDiscussionContentType,
    ProductDiscussionReportStatus,
} = Constants;

const productDiscussionEntityType = new GraphQLEnumType({
    name: "ProductDiscussionEntityType",
    values: Object.fromEntries(
        Object.entries(ProductDiscussionEntityType).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const productDiscussionContentType = new GraphQLEnumType({
    name: "ProductDiscussionContentType",
    values: Object.fromEntries(
        Object.entries(ProductDiscussionContentType).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const productDiscussionReportStatusType = new GraphQLEnumType({
    name: "ProductDiscussionReportStatus",
    values: Object.fromEntries(
        Object.entries(ProductDiscussionReportStatus).map(([key, value]) => [
            key,
            { value: value },
        ]),
    ),
});

const productDiscussionReply = new GraphQLObjectType({
    name: "ProductDiscussionReply",
    fields: {
        productId: { type: new GraphQLNonNull(GraphQLString) },
        entityType: { type: new GraphQLNonNull(productDiscussionEntityType) },
        entityId: { type: new GraphQLNonNull(GraphQLString) },
        commentId: { type: new GraphQLNonNull(GraphQLString) },
        replyId: { type: new GraphQLNonNull(GraphQLString) },
        parentReplyId: { type: GraphQLString },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLJSONObject },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        hasLiked: {
            type: new GraphQLNonNull(GraphQLBoolean),
            resolve: async (reply, _, ctx) => {
                if (typeof reply.hasLiked === "boolean") {
                    return reply.hasLiked;
                }
                if (!ctx.user || !ctx.user.userId) {
                    return false;
                }
                const like = await ProductDiscussionLikeModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: ctx.user.userId,
                    contentId: reply.replyId,
                });
                return !!like;
            },
        },
        deleted: { type: new GraphQLNonNull(GraphQLBoolean) },
        createdAt: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: (reply) =>
                reply.createdAt instanceof Date
                    ? reply.createdAt.toISOString()
                    : new Date(reply.createdAt).toISOString(),
        },
        updatedAt: {
            type: GraphQLString,
            resolve: (reply) =>
                reply.updatedAt
                    ? reply.updatedAt instanceof Date
                        ? reply.updatedAt.toISOString()
                        : new Date(reply.updatedAt).toISOString()
                    : null,
        },
        user: {
            type: userTypes.userType,
            resolve: async (reply, _, ctx) => {
                return await UserModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: reply.userId,
                });
            },
        },
    },
});

const productDiscussionComment = new GraphQLObjectType({
    name: "ProductDiscussionComment",
    fields: {
        productId: { type: new GraphQLNonNull(GraphQLString) },
        entityType: { type: new GraphQLNonNull(productDiscussionEntityType) },
        entityId: { type: new GraphQLNonNull(GraphQLString) },
        commentId: { type: new GraphQLNonNull(GraphQLString) },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLJSONObject },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        hasLiked: {
            type: new GraphQLNonNull(GraphQLBoolean),
            resolve: async (comment, _, ctx) => {
                if (typeof comment.hasLiked === "boolean") {
                    return comment.hasLiked;
                }
                if (!ctx.user || !ctx.user.userId) {
                    return false;
                }
                const like = await ProductDiscussionLikeModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: ctx.user.userId,
                    contentId: comment.commentId,
                });
                return !!like;
            },
        },
        replyCount: {
            type: new GraphQLNonNull(GraphQLInt),
            resolve: async (comment, _, ctx) => {
                if (typeof comment.replyCount === "number") {
                    return comment.replyCount;
                }
                return await ProductDiscussionReplyModel.countDocuments({
                    domain: ctx.subdomain._id,
                    commentId: comment.commentId,
                });
            },
        },
        replyNextCursor: { type: GraphQLString },
        hasMoreReplies: {
            type: new GraphQLNonNull(GraphQLBoolean),
            resolve: (comment) => Boolean(comment.hasMoreReplies),
        },
        replies: {
            type: new GraphQLList(productDiscussionReply),
            resolve: async (comment, _, ctx) => {
                if (comment.replies) {
                    return comment.replies;
                }
                return await ProductDiscussionReplyModel.find({
                    domain: ctx.subdomain._id,
                    commentId: comment.commentId,
                })
                    .sort({ createdAt: 1, replyId: 1 })
                    .limit(2);
            },
        },
        deleted: { type: new GraphQLNonNull(GraphQLBoolean) },
        createdAt: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: (comment) =>
                comment.createdAt instanceof Date
                    ? comment.createdAt.toISOString()
                    : new Date(comment.createdAt).toISOString(),
        },
        updatedAt: {
            type: GraphQLString,
            resolve: (comment) =>
                comment.updatedAt
                    ? comment.updatedAt instanceof Date
                        ? comment.updatedAt.toISOString()
                        : new Date(comment.updatedAt).toISOString()
                    : null,
        },
        user: {
            type: userTypes.userType,
            resolve: async (comment, _, ctx) => {
                return await UserModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: comment.userId,
                });
            },
        },
    },
});

const productDiscussionCommentsConnection = new GraphQLObjectType({
    name: "ProductDiscussionCommentsConnection",
    fields: {
        items: { type: new GraphQLList(productDiscussionComment) },
        nextCursor: { type: GraphQLString },
        hasMore: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const productDiscussionRepliesConnection = new GraphQLObjectType({
    name: "ProductDiscussionRepliesConnection",
    fields: {
        items: { type: new GraphQLList(productDiscussionReply) },
        nextCursor: { type: GraphQLString },
        hasMore: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const productDiscussionLikeResult = new GraphQLObjectType({
    name: "ProductDiscussionLikeResult",
    fields: {
        contentType: { type: new GraphQLNonNull(productDiscussionContentType) },
        contentId: { type: new GraphQLNonNull(GraphQLString) },
        likesCount: { type: new GraphQLNonNull(GraphQLInt) },
        hasLiked: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const productDiscussionSummary = new GraphQLObjectType({
    name: "ProductDiscussionSummary",
    fields: {
        productId: { type: new GraphQLNonNull(GraphQLString) },
        entityType: { type: new GraphQLNonNull(productDiscussionEntityType) },
        entityId: { type: new GraphQLNonNull(GraphQLString) },
        commentsCount: { type: new GraphQLNonNull(GraphQLInt) },
        repliesCount: { type: new GraphQLNonNull(GraphQLInt) },
        totalCount: { type: new GraphQLNonNull(GraphQLInt) },
        activityCountIncludingDeleted: {
            type: new GraphQLNonNull(GraphQLInt),
        },
        lastActivityAt: { type: new GraphQLNonNull(GraphQLString) },
        lastCommentId: { type: GraphQLString },
        lastReplyId: { type: GraphQLString },
    },
});

const productDiscussionSummariesConnection = new GraphQLObjectType({
    name: "ProductDiscussionSummariesConnection",
    fields: {
        items: { type: new GraphQLList(productDiscussionSummary) },
        nextCursor: { type: GraphQLString },
        hasMore: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

const productDiscussionReport = new GraphQLObjectType({
    name: "ProductDiscussionReport",
    fields: {
        productId: { type: new GraphQLNonNull(GraphQLString) },
        entityType: { type: new GraphQLNonNull(productDiscussionEntityType) },
        entityId: { type: new GraphQLNonNull(GraphQLString) },
        reportId: { type: new GraphQLNonNull(GraphQLString) },
        contentType: { type: new GraphQLNonNull(productDiscussionContentType) },
        contentId: { type: new GraphQLNonNull(GraphQLString) },
        commentId: { type: GraphQLString },
        userId: { type: new GraphQLNonNull(GraphQLString) },
        reason: { type: new GraphQLNonNull(GraphQLString) },
        status: { type: new GraphQLNonNull(GraphQLString) },
        rejectionReason: { type: GraphQLString },
        createdAt: {
            type: new GraphQLNonNull(GraphQLString),
            resolve: (report) =>
                report.createdAt instanceof Date
                    ? report.createdAt.toISOString()
                    : new Date(report.createdAt).toISOString(),
        },
        updatedAt: {
            type: GraphQLString,
            resolve: (report) =>
                report.updatedAt
                    ? report.updatedAt instanceof Date
                        ? report.updatedAt.toISOString()
                        : new Date(report.updatedAt).toISOString()
                    : null,
        },
        lessonTitle: {
            type: GraphQLString,
            resolve: async (report, _, ctx) => {
                if (report.entityType !== ProductDiscussionEntityType.LESSON)
                    return null;
                const lesson = await LessonModel.findOne({
                    domain: ctx.subdomain._id,
                    lessonId: report.entityId,
                });
                return lesson ? lesson.title : null;
            },
        },
        contentPreview: {
            type: GraphQLString,
            resolve: async (report, _, ctx) => {
                const item =
                    report.contentType === ProductDiscussionContentType.COMMENT
                        ? await ProductDiscussionCommentModel.findOne({
                              domain: ctx.subdomain._id,
                              commentId: report.contentId,
                          })
                        : await ProductDiscussionReplyModel.findOne({
                              domain: ctx.subdomain._id,
                              replyId: report.contentId,
                          });
                if (!item) return null;
                return extractTextFromTextEditorContent(item.content);
            },
        },
        authorName: {
            type: GraphQLString,
            resolve: async (report, _, ctx) => {
                const item =
                    report.contentType === ProductDiscussionContentType.COMMENT
                        ? await ProductDiscussionCommentModel.findOne({
                              domain: ctx.subdomain._id,
                              commentId: report.contentId,
                          })
                        : await ProductDiscussionReplyModel.findOne({
                              domain: ctx.subdomain._id,
                              replyId: report.contentId,
                          });
                if (!item) return null;
                const user = await UserModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: item.userId,
                });
                return user ? user.name || user.email : item.userId;
            },
        },
        reporterName: {
            type: GraphQLString,
            resolve: async (report, _, ctx) => {
                const user = await UserModel.findOne({
                    domain: ctx.subdomain._id,
                    userId: report.userId,
                });
                return user ? user.name || user.email : report.userId;
            },
        },
    },
});

const productDiscussionReportsConnection = new GraphQLObjectType({
    name: "ProductDiscussionReportsConnection",
    fields: {
        items: { type: new GraphQLList(productDiscussionReport) },
        nextCursor: { type: GraphQLString },
        hasMore: { type: new GraphQLNonNull(GraphQLBoolean) },
    },
});

export default {
    productDiscussionEntityType,
    productDiscussionContentType,
    productDiscussionReportStatusType,
    productDiscussionComment,
    productDiscussionReply,
    productDiscussionCommentsConnection,
    productDiscussionRepliesConnection,
    productDiscussionLikeResult,
    productDiscussionSummary,
    productDiscussionSummariesConnection,
    productDiscussionReport,
    productDiscussionReportsConnection,
};
