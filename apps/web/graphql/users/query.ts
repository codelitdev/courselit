import {
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLID,
} from "graphql";
import types from "./types";
import {
    getUser,
    getUsers,
    getUsersCount,
    getSegments,
    getTagsWithDetails,
    getTags,
    inviteCustomer,
} from "./logic";
import GQLContext from "../../models/GQLContext";

const queries = {
    getUser: {
        type: types.userType,
        args: {
            email: { type: GraphQLString },
            userId: { type: GraphQLString },
        },
        resolve: (_: any, { userId }: any, context: GQLContext) =>
            getUser(userId, context),
    },
    getUsers: {
        type: new GraphQLList(types.userType),
        args: {
            searchData: { type: types.userSearchInput },
        },
        resolve: (_: any, { searchData }: any, context: GQLContext) =>
            getUsers({ searchData, ctx: context }),
    },

    inviteCustomer: {
        type: types.userType,
        args: {
            email: { type: GraphQLString },
            tags: { type: new GraphQLList(GraphQLString) },
            id: { type: new GraphQLNonNull(GraphQLID) },
        },
        resolve: (_: any, { email, tags, id }: any, context: GQLContext) =>
            inviteCustomer(email, tags, id, context),
    },

    getUsersCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            searchData: { type: types.userSearchInput },
        },
        resolve: (_: any, { searchData }: any, context: GQLContext) =>
            getUsersCount(searchData, context),
    },
    segments: {
        type: new GraphQLList(types.userSegment),
        resolve: (_: any, __: any, context: GQLContext) => getSegments(context),
    },
    tags: {
        type: new GraphQLList(GraphQLString),
        resolve: (_: any, __: any, ctx: any) => getTags(ctx),
    },
    tagsWithDetails: {
        type: new GraphQLList(types.tagWithDetails),
        resolve: (_: any, __: any, ctx: any) => getTagsWithDetails(ctx),
    },
};

export default queries;
