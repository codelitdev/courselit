import {
    GraphQLInt,
    GraphQLString,
    GraphQLList,
    GraphQLNonNull,
    GraphQLBoolean
} from "graphql";
import types from "./types";
import { getUser, getUsers, getUsersCount } from "./logic";
import GQLContext from "../../models/GQLContext";

export default {
    getUser: {
        type: types.userType,
        args: {
            email: { type: GraphQLString },
            userId: { type: GraphQLString },
        },
        resolve: (_: any, { email, userId }: any, context: GQLContext) =>
            getUser(email, userId, context),
    },
    getUsers: {
        type: new GraphQLList(types.userType),
        args: {
            searchData: { type: types.userSearchInput },
            noPagination: { type: GraphQLBoolean }
        },
        resolve: (_: any, { searchData, noPagination }: any, context: GQLContext) =>
            getUsers(searchData, context, noPagination),
    },
    getUsersCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            searchData: { type: types.userSearchInput },
        },
        resolve: (_: any, { searchData }: any, context: GQLContext) =>
            getUsersCount(searchData, context),
    },
};
