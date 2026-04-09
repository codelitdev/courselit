import types from "./types";
import {
    getApikeys,
    getExternalLoginProviders,
    getFeatures,
    getGoogleProviderSettings,
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
    getGoogleProviderSettings: {
        type: types.googleProviderSettingsType,
        resolve: (_: any, {}: any, context: GQLContext) =>
            getGoogleProviderSettings(context),
    },
    getSSOProviderSettings: {
        type: types.ssoProviderSettingsType,
        resolve: (_: any, {}: any, context: GQLContext) =>
            getSSOProviderSettings(context),
    },
    getExternalLoginProviders: {
        type: new GraphQLList(types.loginProviderType),
        resolve: (_: any, {}: any, context: GQLContext) =>
            getExternalLoginProviders(context),
    },
    getFeatures: {
        type: new GraphQLList(GraphQLString),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) => getFeatures(context),
    },
};

export default queries;
