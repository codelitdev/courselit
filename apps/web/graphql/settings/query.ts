import types from "./types";
import {
    getApikeys,
    getFeatures,
    getLoginProviders,
    getSiteInfo,
    getSSOProviders,
} from "./logic";
import { GraphQLInt, GraphQLList, GraphQLString } from "graphql";
import GQLContext from "@models/GQLContext";

const queries = {
    getSiteInfo: {
        type: types.domain,
        resolve: (_: any, __: any, ctx: any) => getSiteInfo(ctx),
    },
    getApikeys: {
        type: new GraphQLList(types.apikeyType),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) => getApikeys(context),
    },
    getSSOProviders: {
        type: new GraphQLList(types.ssoProviderType),
        args: {
            page: { type: GraphQLInt },
            limit: { type: GraphQLInt },
        },
        resolve: (_: any, { page, limit }: any, context: GQLContext) =>
            getSSOProviders({ ctx: context, page, limit }),
    },
    getFeatures: {
        type: new GraphQLList(GraphQLString),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) => getFeatures(context),
    },
    getLoginProviders: {
        type: new GraphQLList(GraphQLString),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) =>
            getLoginProviders(context),
    },
};

export default queries;
