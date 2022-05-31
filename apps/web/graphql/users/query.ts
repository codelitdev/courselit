import { GraphQLString, GraphQLList } from "graphql";
import types from "./types";
import { getUser, getUsers } from "./logic";
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
        },
        resolve: (_: any, { searchData }: any, context: GQLContext) =>
            getUsers(searchData, context),
    },
};
