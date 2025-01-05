import GQLContext from "@models/GQLContext";
import types from "./types";
import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import {
    getComments,
    getCommunities,
    getCommunitiesCount,
    getCommunity,
    getCommunityReports,
    getCommunityReportsCount,
    getMemberStatus,
    getMembers,
    getMembersCount,
    getPost,
    getPosts,
    getPostsCount,
} from "./logic";
import {
    CommunityMemberStatus,
    CommunityReportStatus,
} from "@courselit/common-models";

const queries = {
    getCommunity: {
        type: types.community,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { id }: { id: string }, ctx: GQLContext) =>
            getCommunity({ ctx, id }),
    },
    getCommunities: {
        type: new GraphQLList(types.community),
        args: {
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
        },
        resolve: (
            _: any,
            { page, limit }: { page?: number; limit?: number },
            ctx: GQLContext,
        ) => getCommunities({ ctx, page, limit }),
    },
    getMembers: {
        type: new GraphQLList(types.communityMemberStatus),
        args: {
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            status: {
                type: types.memberStatusType,
            },
        },
        resolve: async (
            _: any,
            {
                communityId,
                page,
                limit,
                status,
            }: {
                communityId: string;
                page?: number;
                limit?: number;
                status?: CommunityMemberStatus;
            },
            ctx: GQLContext,
        ) => getMembers({ ctx, communityId, page, limit, status }),
    },
    getCommunitiesCount: {
        type: GraphQLInt,
        resolve: (_: any, __: any, ctx: GQLContext) =>
            getCommunitiesCount({ ctx }),
    },
    getMembersCount: {
        type: GraphQLInt,
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            status: {
                type: types.memberStatusType,
            },
        },
        resolve: (
            _: any,
            {
                communityId,
                status,
            }: {
                communityId: string;
                status?: CommunityMemberStatus;
            },
            ctx: GQLContext,
        ) => getMembersCount({ ctx, communityId, status }),
    },
    getMemberStatus: {
        type: types.communityMemberStatus,
        args: {
            id: {
                type: GraphQLString,
            },
        },
        resolve: async (
            _: any,
            { id: communityId }: { id: string },
            ctx: GQLContext,
        ) => getMemberStatus({ ctx, communityId }),
    },
    getPost: {
        type: types.communityPost,
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            postId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
            }: {
                communityId: string;
                postId: string;
            },
            ctx: GQLContext,
        ) => getPost({ ctx, communityId, postId }),
    },
    getPosts: {
        type: new GraphQLList(types.communityPost),
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
            category: {
                type: GraphQLString,
            },
        },
        resolve: async (
            _: any,
            {
                communityId,
                page,
                limit,
                category,
            }: {
                communityId: string;
                page?: number;
                limit?: number;
                category?: string;
            },
            ctx: GQLContext,
        ) => getPosts({ ctx, communityId, page, limit, category }),
    },
    getPostsCount: {
        type: GraphQLInt,
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            category: {
                type: GraphQLString,
            },
        },
        resolve: (
            _: any,
            {
                communityId,
                category,
            }: {
                communityId: string;
                category?: string;
            },
            ctx: GQLContext,
        ) => getPostsCount({ ctx, communityId, category }),
    },
    getComments: {
        type: new GraphQLList(types.communityComment),
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            postId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
        },
        resolve: async (
            _: any,
            {
                communityId,
                postId,
                page,
                limit,
            }: {
                communityId: string;
                postId: string;
                page?: number;
                limit?: number;
            },
            ctx: GQLContext,
        ) => getComments({ ctx, communityId, postId, page, limit }),
    },
    getCommunityReports: {
        type: new GraphQLList(types.communityReport),
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
            status: {
                type: types.communityReportStatusType,
            },
        },
        resolve: async (
            _: any,
            {
                communityId,
                page,
                limit,
                status,
            }: {
                communityId: string;
                page?: number;
                limit?: number;
                status?: CommunityReportStatus;
            },
            ctx: GQLContext,
        ) => getCommunityReports({ ctx, communityId, page, limit, status }),
    },
    getCommunityReportsCount: {
        type: GraphQLInt,
        args: {
            communityId: {
                type: new GraphQLNonNull(GraphQLString),
            },
            status: {
                type: types.communityReportStatusType,
            },
        },
        resolve: (
            _: any,
            {
                communityId,
                status,
            }: {
                communityId: string;
                status?: CommunityReportStatus;
            },
            ctx: GQLContext,
        ) => getCommunityReportsCount({ ctx, communityId, status }),
    },
};

export default queries;
