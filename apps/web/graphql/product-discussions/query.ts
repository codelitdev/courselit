import GQLContext from "@models/GQLContext";
import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import {
    getDiscussionReportsCount,
    listDiscussionComments,
    listDiscussionReports,
    listDiscussionReplies,
    ProductDiscussionContentType,
    listDiscussionSummaries,
    ProductDiscussionEntityType,
} from "./logic";
import types from "./types";

const queries = {
    getProductDiscussionComments: {
        type: types.productDiscussionCommentsConnection,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            entityType: {
                type: new GraphQLNonNull(types.productDiscussionEntityType),
            },
            entityId: { type: new GraphQLNonNull(GraphQLString) },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
            replyPreviewLimit: { type: GraphQLInt },
            targetContentType: {
                type: types.productDiscussionContentType,
            },
            targetContentId: { type: GraphQLString },
        },
        resolve: (
            _: any,
            {
                productId,
                entityType,
                entityId,
                cursor,
                limit,
                replyPreviewLimit,
                targetContentType,
                targetContentId,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                cursor?: string;
                limit?: number;
                replyPreviewLimit?: number;
                targetContentType?: ProductDiscussionContentType;
                targetContentId?: string;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionComments({
                ctx,
                productId,
                entityType,
                entityId,
                targetContentType,
                targetContentId,
                cursor,
                limit,
                replyPreviewLimit,
            }),
    },
    getProductDiscussionReplies: {
        type: types.productDiscussionRepliesConnection,
        args: {
            commentId: { type: new GraphQLNonNull(GraphQLString) },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                commentId,
                cursor,
                limit,
            }: {
                commentId: string;
                cursor?: string;
                limit?: number;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionReplies({
                ctx,
                commentId,
                cursor,
                limit,
            }),
    },
    getProductDiscussionReports: {
        type: types.productDiscussionReportsConnection,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            status: { type: types.productDiscussionReportStatusType },
            page: { type: GraphQLInt },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                productId,
                status,
                page,
                cursor,
                limit,
            }: {
                productId: string;
                status?: "pending" | "accepted" | "rejected";
                page?: number;
                cursor?: string;
                limit?: number;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionReports({
                ctx,
                productId,
                status,
                page,
                cursor,
                limit,
            }),
    },
    getProductDiscussionSummaries: {
        type: types.productDiscussionSummariesConnection,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            preview: { type: GraphQLBoolean },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                productId,
                preview,
                cursor,
                limit,
            }: {
                productId: string;
                preview?: boolean;
                cursor?: string;
                limit?: number;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionSummaries({
                ctx,
                productId,
                preview,
                cursor,
                limit,
            }),
    },
    getProductDiscussionReportsCount: {
        type: GraphQLInt,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            status: { type: types.productDiscussionReportStatusType },
        },
        resolve: (
            _: any,
            {
                productId,
                status,
            }: {
                productId: string;
                status?: "pending" | "accepted" | "rejected";
            },
            ctx: GQLContext,
        ) => getDiscussionReportsCount({ ctx, productId, status }),
    },
};

export default queries;
