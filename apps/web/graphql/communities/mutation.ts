import GQLContext from "@models/GQLContext";
import {
    GraphQLBoolean,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import {
    createCommunity,
    updateCommunity,
    addCategory,
    deleteCategory,
    createCommunityPost,
    joinCommunity,
    updateMemberStatus,
    togglePostLike,
    togglePinned,
    postComment,
    toggleCommentLike,
    toggleCommentReplyLike,
    deleteComment,
    leaveCommunity,
    deleteCommunity,
    deleteCommunityPost,
    reportCommunityContent,
    updateCommunityReportStatus,
    updateMemberRole,
} from "./logic";
import types from "./types";
import {
    CommunityMedia,
    CommunityReportType,
    Media,
} from "@courselit/common-models";
import mediaTypes from "../media/types";

const mutations = {
    createCommunity: {
        type: types.community,
        args: {
            name: { type: GraphQLString },
        },
        resolve: async (_: any, { name }: { name: string }, ctx: GQLContext) =>
            createCommunity({ name, ctx }),
    },
    updateCommunity: {
        type: types.community,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            name: { type: GraphQLString },
            description: { type: GraphQLString },
            enabled: { type: GraphQLBoolean },
            banner: { type: GraphQLString },
            autoAcceptMembers: { type: GraphQLBoolean },
            joiningReasonText: { type: GraphQLString },
            featuredImage: { type: mediaTypes.mediaInputType },
        },
        resolve: async (
            _: any,
            {
                id,
                name,
                description,
                enabled,
                banner,
                autoAcceptMembers,
                joiningReasonText,
                featuredImage,
            }: {
                id: string;
                name?: string;
                description?: string;
                enabled?: boolean;
                banner?: string;
                autoAcceptMembers?: boolean;
                joiningReasonText?: string;
                featuredImage?: Media;
            },
            ctx: GQLContext,
        ) =>
            updateCommunity({
                id,
                name,
                description,
                ctx,
                enabled,
                banner,
                autoAcceptMembers,
                joiningReasonText,
                featuredImage,
            }),
    },
    addCategory: {
        type: types.community,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            category: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { id, category }: { id: string; category: string },
            ctx: GQLContext,
        ) => addCategory({ id, category, ctx }),
    },
    deleteCategory: {
        type: types.community,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            category: { type: new GraphQLNonNull(GraphQLString) },
            migrateToCategory: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                id,
                category,
                migrateToCategory,
            }: { id: string; category: string; migrateToCategory?: string },
            ctx: GQLContext,
        ) => deleteCategory({ id, category, ctx, migrateToCategory }),
    },
    joinCommunity: {
        type: types.communityMemberStatus,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            joiningReason: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: (
            _: any,
            { id, joiningReason }: { id: string; joiningReason: string },
            ctx: GQLContext,
        ) => joinCommunity({ id, joiningReason, ctx }),
    },
    createCommunityPost: {
        type: types.communityPost,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
            title: { type: new GraphQLNonNull(GraphQLString) },
            content: { type: new GraphQLNonNull(GraphQLString) },
            category: { type: new GraphQLNonNull(GraphQLString) },
            media: { type: new GraphQLList(types.communityPostInputMedia) },
        },
        resolve: async (
            _: any,
            {
                id: communityId,
                title,
                content,
                category,
                media,
            }: {
                id: string;
                title: string;
                content: string;
                category: string;
                media?: CommunityMedia[];
            },
            ctx: GQLContext,
        ) =>
            createCommunityPost({
                communityId,
                title,
                content,
                category,
                media,
                ctx,
            }),
    },
    deleteCommunityPost: {
        type: types.communityPost,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { communityId, postId }: { communityId: string; postId: string },
            ctx: GQLContext,
        ) => deleteCommunityPost({ communityId, postId, ctx }),
    },
    updateMemberStatus: {
        type: types.communityMemberStatus,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            userId: { type: new GraphQLNonNull(GraphQLString) },
            rejectionReason: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                communityId,
                userId,
                rejectionReason,
            }: {
                communityId: string;
                userId: string;
                rejectionReason?: string;
            },
            ctx: GQLContext,
        ) =>
            updateMemberStatus({
                communityId,
                userId,
                rejectionReason,
                ctx,
            }),
    },
    updateMemberRole: {
        type: types.communityMemberStatus,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            userId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            {
                communityId,
                userId,
            }: {
                communityId: string;
                userId: string;
            },
            ctx: GQLContext,
        ) =>
            updateMemberRole({
                communityId,
                userId,
                ctx,
            }),
    },
    togglePostLike: {
        type: types.communityPost,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { communityId, postId }: { communityId: string; postId: string },
            ctx: GQLContext,
        ) => togglePostLike({ communityId, postId, ctx }),
    },
    togglePinned: {
        type: types.communityPost,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { communityId, postId }: { communityId: string; postId: string },
            ctx: GQLContext,
        ) => togglePinned({ communityId, postId, ctx }),
    },
    postComment: {
        type: types.communityComment,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
            content: { type: new GraphQLNonNull(GraphQLString) },
            media: { type: new GraphQLList(types.communityPostInputMedia) },
            parentCommentId: { type: GraphQLString },
            parentReplyId: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
                content,
                media,
                parentCommentId,
                parentReplyId,
            }: {
                communityId: string;
                postId: string;
                content: string;
                media?: CommunityMedia[];
                parentCommentId?: string;
                parentReplyId?: string;
            },
            ctx: GQLContext,
        ) =>
            postComment({
                communityId,
                postId,
                content,
                media,
                parentCommentId,
                parentReplyId,
                ctx,
            }),
    },
    toggleCommentLike: {
        type: types.communityComment,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
            commentId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
                commentId,
            }: { communityId: string; postId: string; commentId: string },
            ctx: GQLContext,
        ) => toggleCommentLike({ communityId, postId, commentId, ctx }),
    },
    toggleCommentReplyLike: {
        type: types.communityComment,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
            commentId: { type: new GraphQLNonNull(GraphQLString) },
            replyId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
                commentId,
                replyId,
            }: {
                communityId: string;
                postId: string;
                commentId: string;
                replyId: string;
            },
            ctx: GQLContext,
        ) =>
            toggleCommentReplyLike({
                communityId,
                postId,
                commentId,
                replyId,
                ctx,
            }),
    },
    deleteComment: {
        type: types.communityComment,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            postId: { type: new GraphQLNonNull(GraphQLString) },
            commentId: { type: new GraphQLNonNull(GraphQLString) },
            replyId: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
                commentId,
                replyId,
            }: {
                communityId: string;
                postId: string;
                commentId: string;
                replyId?: string;
            },
            ctx: GQLContext,
        ) => deleteComment({ communityId, postId, commentId, replyId, ctx }),
    },
    leaveCommunity: {
        type: types.communityMemberStatus,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { id }: { id: string }, ctx: GQLContext) =>
            leaveCommunity({ id, ctx }),
    },
    deleteCommunity: {
        type: types.community,
        args: {
            id: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { id }: { id: string }, ctx: GQLContext) =>
            deleteCommunity({ id, ctx }),
    },
    reportCommunityContent: {
        type: types.communityReport,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            contentId: { type: new GraphQLNonNull(GraphQLString) },
            type: {
                type: new GraphQLNonNull(types.communityReportContentType),
            },
            reason: { type: new GraphQLNonNull(GraphQLString) },
            contentParentId: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                communityId,
                contentId,
                type,
                reason,
                contentParentId,
            }: {
                communityId: string;
                contentId: string;
                type: CommunityReportType;
                reason: string;
                contentParentId?: string;
            },
            ctx: GQLContext,
        ) =>
            reportCommunityContent({
                communityId,
                contentId,
                type,
                reason,
                ctx,
                contentParentId,
            }),
    },
    updateCommunityReportStatus: {
        type: types.communityReport,
        args: {
            communityId: { type: new GraphQLNonNull(GraphQLString) },
            reportId: { type: new GraphQLNonNull(GraphQLString) },
            rejectionReason: { type: GraphQLString },
        },
        resolve: async (
            _: any,
            {
                communityId,
                reportId,
                rejectionReason,
            }: {
                communityId: string;
                reportId: string;
                rejectionReason?: string;
            },
            ctx: GQLContext,
        ) =>
            updateCommunityReportStatus({
                communityId,
                reportId,
                rejectionReason,
                ctx,
            }),
    },
};

export default mutations;
