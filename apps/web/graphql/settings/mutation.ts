import { GraphQLNonNull } from "graphql";
import types from "./types";
import { updateSiteInfo, updatePaymentInfo } from "./logic";

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
            context: any
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
            context: any
        ) => updatePaymentInfo(siteData, context),
    },
};
