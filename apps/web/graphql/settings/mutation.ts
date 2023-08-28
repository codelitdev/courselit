import { GraphQLList, GraphQLNonNull } from "graphql";
import types from "./types";
import {
    updateSiteInfo,
    updatePaymentInfo,
    updateDraftTypefaces,
} from "./logic";
import { Typeface } from "@courselit/common-models";

export default {
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
};
