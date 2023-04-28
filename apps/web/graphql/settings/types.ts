import {
    GraphQLObjectType,
    GraphQLString,
    GraphQLInputObjectType,
    GraphQLNonNull,
    GraphQLList,
} from "graphql";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
import designTypes from "../design/types";
const { mediaType } = mediaTypes;

const siteUpdateType = new GraphQLInputObjectType({
    name: "SiteInfoUpdateInput",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logo: { type: mediaTypes.mediaInputType },
        codeInjectionHead: { type: GraphQLString },
        codeInjectionBody: { type: GraphQLString },
    },
});

const sitePaymentUpdateType = new GraphQLInputObjectType({
    name: "SitePaymentUpdateInput",
    fields: {
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripePublishableKey: { type: GraphQLString },
        stripeSecret: { type: GraphQLString },
        paytmSecret: { type: GraphQLString },
        paypalSecret: { type: GraphQLString },
    },
});

const siteType = new GraphQLObjectType({
    name: "SiteInfo",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logo: {
            type: mediaType,
            resolve: (settings, _, __, ___) => getMedia(settings.logo),
        },
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripePublishableKey: { type: GraphQLString },
        codeInjectionHead: { type: GraphQLString },
        codeInjectionBody: { type: GraphQLString },
    },
});

const domain = new GraphQLObjectType({
    name: "Domain",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        settings: { type: siteType },
        theme: { type: designTypes.themeType },
        featureFlags: { type: new GraphQLList(GraphQLString) },
    },
});

export default {
    siteUpdateType,
    sitePaymentUpdateType,
    domain,
};
