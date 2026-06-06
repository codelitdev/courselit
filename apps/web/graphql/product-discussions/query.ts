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
            admin: { type: GraphQLBoolean },
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
                admin,
                targetContentType,
                targetContentId,
            }: {
                productId: string;
                entityType: ProductDiscussionEntityType;
                entityId: string;
                cursor?: string;
                limit?: number;
                replyPreviewLimit?: number;
                admin?: boolean;
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
                admin,
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
            admin: { type: GraphQLBoolean },
        },
        resolve: (
            _: any,
            {
                commentId,
                cursor,
                limit,
                admin,
            }: {
                commentId: string;
                cursor?: string;
                limit?: number;
                admin?: boolean;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionReplies({
                ctx,
                commentId,
                admin,
                cursor,
                limit,
            }),
    },
    getProductDiscussionReports: {
        type: types.productDiscussionReportsConnection,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            status: { type: types.productDiscussionReportStatusType },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                productId,
                status,
                cursor,
                limit,
            }: {
                productId: string;
                status?: "pending" | "accepted" | "rejected";
                cursor?: string;
                limit?: number;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionReports({
                ctx,
                productId,
                status,
                cursor,
                limit,
            }),
    },
    getProductDiscussionSummaries: {
        type: types.productDiscussionSummariesConnection,
        args: {
            productId: { type: new GraphQLNonNull(GraphQLString) },
            admin: { type: GraphQLBoolean },
            cursor: { type: GraphQLString },
            limit: { type: GraphQLInt },
        },
        resolve: (
            _: any,
            {
                productId,
                admin,
                cursor,
                limit,
            }: {
                productId: string;
                admin?: boolean;
                cursor?: string;
                limit?: number;
            },
            ctx: GQLContext,
        ) =>
            listDiscussionSummaries({
                ctx,
                productId,
                admin,
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
