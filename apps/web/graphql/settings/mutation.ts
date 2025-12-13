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
    addSSOProvider,
    removeSSOProvider,
    toggleLoginProvider,
} from "./logic";
import { LoginProvider, Typeface } from "@courselit/common-models";

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
    addSSOProvider: {
        type: types.ssoProviderType,
        args: {
            providerId: { type: new GraphQLNonNull(GraphQLString) },
            idpMetadata: { type: new GraphQLNonNull(GraphQLString) },
            domain: { type: new GraphQLNonNull(GraphQLString) },
            entryPoint: { type: new GraphQLNonNull(GraphQLString) },
            cert: { type: new GraphQLNonNull(GraphQLString) },
            callbackUrl: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            {
                providerId,
                idpMetadata,
                domain,
                entryPoint,
                cert,
                callbackUrl,
            }: {
                providerId: string;
                idpMetadata: string;
                domain: string;
                entryPoint: string;
                cert: string;
                callbackUrl: string;
            },
            context: any,
        ) =>
            addSSOProvider({
                providerId,
                idpMetadata,
                domain,
                entryPoint,
                cert,
                callbackUrl,
                context,
            }),
    },
    removeSSOProvider: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            providerId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { providerId }: { providerId: string },
            context: any,
        ) => removeSSOProvider(providerId, context),
    },
    toggleLoginProvider: {
        type: new GraphQLNonNull(new GraphQLList(GraphQLString)),
        args: {
            provider: { type: new GraphQLNonNull(GraphQLString) },
            value: { type: new GraphQLNonNull(GraphQLBoolean) },
        },
        resolve: async (
            _: any,
            {
                provider,
                value,
            }: {
                provider: LoginProvider;
                value: boolean;
            },
            context: any,
        ) => toggleLoginProvider({ provider, value, ctx: context }),
    },
};

export default mutations;
