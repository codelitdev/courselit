import GQLContext from "@models/GQLContext";
import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import {
    createDiscussionComment,
    createDiscussionReply,
    createDiscussionReport,
    deleteDiscussionComment,
    deleteDiscussionReply,
    toggleDiscussionLike,
    updateDiscussionReportStatus,
    updateDiscussionComment,
    updateDiscussionReply,
} from "./logic";
import types from "./types";
import {
    ProductDiscussionContentType,
    ProductDiscussionEntityType,
} from "@courselit/common-models";

const targetArgs = {
    productId: { type: new GraphQLNonNull(GraphQLString) },
    entityType: { type: new GraphQLNonNull(types.productDiscussionEntityType) },
    entityId: { type: new GraphQLNonNull(GraphQLString) },
};

const mutations = {
    createProductDiscussionComment: {
        type: types.productDiscussionComment,
        args: {
            ...targetArgs,
            content: { type: new GraphQLNonNull(GraphQLJSONObject) },
        },
        resolve: (
            _: any,
            {
                productId,
                entityType,
                entityId,
                content,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                content: unknown;
            },
            ctx: GQLContext,
        ) =>
            createDiscussionComment({
                ctx,
                productId,
                entityType,
                entityId,
                content,
            }),
    },
    createProductDiscussionReply: {
        type: types.productDiscussionReply,
        args: {
            ...targetArgs,
            commentId: { type: new GraphQLNonNull(GraphQLString) },
            parentReplyId: { type: GraphQLString },
            content: { type: new GraphQLNonNull(GraphQLJSONObject) },
        },
        resolve: (
            _: any,
            {
                productId,
                entityType,
                entityId,
                commentId,
                parentReplyId,
                content,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                commentId: string;
                parentReplyId?: string;
                content: unknown;
            },
            ctx: GQLContext,
        ) =>
            createDiscussionReply({
                ctx,
                productId,
                entityType,
                entityId,
                commentId,
                parentReplyId,
                content,
            }),
    },
    toggleProductDiscussionLike: {
        type: types.productDiscussionLikeResult,
        args: {
            ...targetArgs,
            contentType: {
                type: new GraphQLNonNull(types.productDiscussionContentType),
            },
            contentId: { type: new GraphQLNonNull(GraphQLString) },
            liked: { type: new GraphQLNonNull(GraphQLBoolean) },
        },
        resolve: (
            _: any,
            {
                productId,
                entityType,
                entityId,
                contentType,
                contentId,
                liked,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                contentType: ProductDiscussionContentType;
                contentId: string;
                liked: boolean;
            },
            ctx: GQLContext,
        ) =>
            toggleDiscussionLike({
                ctx,
                productId,
                entityType,
                entityId,
                contentType,
                contentId,
                liked,
            }),
    },
    createProductDiscussionReport: {
        type: types.productDiscussionReport,
        args: {
            ...targetArgs,
            contentType: {
                type: new GraphQLNonNull(types.productDiscussionContentType),
            },
            contentId: { type: new GraphQLNonNull(GraphQLString) },
            reason: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            {
                productId,
                entityType,
                entityId,
                contentType,
                contentId,
                reason,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                contentType: ProductDiscussionContentType;
                contentId: string;
                reason: string;
            },
            ctx: GQLContext,
        ) =>
            createDiscussionReport({
                ctx,
                productId,
                entityType,
                entityId,
                contentType,
                contentId,
                reason,
            }),
    },
    deleteProductDiscussionComment: {
        type: types.productDiscussionComment,
        args: {
            commentId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { commentId }: { commentId: string },
            ctx: GQLContext,
        ) => deleteDiscussionComment({ ctx, commentId }),
    },
    deleteProductDiscussionReply: {
        type: types.productDiscussionReply,
        args: {
            replyId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (_: any, { replyId }: { replyId: string }, ctx: GQLContext) =>
            deleteDiscussionReply({ ctx, replyId }),
    },
    updateProductDiscussionComment: {
        type: types.productDiscussionComment,
        args: {
            commentId: { type: new GraphQLNonNull(GraphQLString) },
            content: { type: new GraphQLNonNull(GraphQLJSONObject) },
        },
        resolve: (
            _: any,
            { commentId, content }: { commentId: string; content: unknown },
            ctx: GQLContext,
        ) => updateDiscussionComment({ ctx, commentId, content }),
    },
    updateProductDiscussionReply: {
        type: types.productDiscussionReply,
        args: {
            replyId: { type: new GraphQLNonNull(GraphQLString) },
            content: { type: new GraphQLNonNull(GraphQLJSONObject) },
        },
        resolve: (
            _: any,
            { replyId, content }: { replyId: string; content: unknown },
            ctx: GQLContext,
        ) => updateDiscussionReply({ ctx, replyId, content }),
    },
    updateProductDiscussionReportStatus: {
        type: types.productDiscussionReport,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            reportId: { type: new GraphQLNonNull(GraphQLString) },
            rejectionReason: { type: GraphQLString },
        },
        resolve: (
            _: any,
            {
                productId,
                reportId,
                rejectionReason,
            }: {
                productId: string;
                reportId: string;
                rejectionReason?: string;
            },
            ctx: GQLContext,
        ) =>
            updateDiscussionReportStatus({
                ctx,
                productId,
                reportId,
                rejectionReason,
            }),
    },
};

export default mutations;
