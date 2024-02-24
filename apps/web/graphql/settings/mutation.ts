import {
    GraphQLBoolean,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import types from "./types";
import {
    updateSiteInfo,
    updatePaymentInfo,
    updateDraftTypefaces,
    removeApikey,
    addApikey,
} from "./logic";
import { Typeface } from "@courselit/common-models";

const mutations = {
    updateSiteInfo: {
        type: types.domain,
        args: {
            siteData: {
                type: new GraphQLNonNull(types.siteUpdateType),
            },
        },
        resolve: async (
            _: any,
            { siteData }: { siteData: Record<string, unknown> },
            context: any,
        ) => updateSiteInfo(siteData, context),
    },
    updatePaymentInfo: {
        type: types.domain,
        args: {
            siteData: {
                type: new GraphQLNonNull(types.sitePaymentUpdateType),
            },
        },
        resolve: async (
            _: any,
            { siteData }: { siteData: Record<string, unknown> },
            context: any,
        ) => updatePaymentInfo(siteData, context),
    },
    updateDraftTypefaces: {
        type: types.domain,
        args: {
            typefaces: {
                type: new GraphQLList(types.typefaceInputType),
            },
        },
        resolve: async (
            _: any,
            { typefaces }: { typefaces: Typeface[] },
            context: any,
        ) => updateDraftTypefaces(typefaces, context),
    },
    addApikey: {
        type: types.newApikeyType,
        args: {
            name: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { name }: { name: string }, context: any) =>
            addApikey(name, context),
    },
    removeApikey: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            keyId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { keyId }: { keyId: string }, context: any) =>
            removeApikey(keyId, context),
    },
};

export default mutations;
