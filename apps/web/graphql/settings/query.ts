import types from "./types";
import {
    getApikeys,
    getFeatures,
    // getLoginProviders,
    getSiteInfo,
    getSSOProvider,
    getSSOProviderSettings,
} from "./logic";
import { GraphQLList, GraphQLString } from "graphql";
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
    getSSOProvider: {
        type: types.ssoProviderType,
        resolve: (_: any, {}: any, context: GQLContext) =>
            getSSOProvider(context),
    },
    getSSOProviderSettings: {
        type: types.ssoProviderSettingsType,
        resolve: (_: any, {}: any, context: GQLContext) =>
            getSSOProviderSettings(context),
    },
    getFeatures: {
        type: new GraphQLList(GraphQLString),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) => getFeatures(context),
    },
    // getLoginProviders: {
    //     type: new GraphQLList(GraphQLString),
    //     args: {},
    //     resolve: (_: any, { }: any, context: GQLContext) =>
    //         getLoginProviders(context),
    // },
};

export default queries;
