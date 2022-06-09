import {
    GraphQLObjectType,
    GraphQLID,
    GraphQLString,
    GraphQLInputObjectType,
    GraphQLNonNull,
    GraphQLList,
} from "graphql";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
const { mediaType } = mediaTypes;
import designTypes from "../design/types";
import menuTypes from "../menus/types";

const siteType = new GraphQLObjectType({
    name: "SiteInfo",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logopath: {
            type: mediaType,
            resolve: (settings, _, context, __) => getMedia(settings.logopath),
        },
        currencyUnit: { type: GraphQLString },
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripePublishableKey: { type: GraphQLString },
        codeInjectionHead: { type: GraphQLString },
    },
});

const siteUpdateType = new GraphQLInputObjectType({
    name: "SiteInfoUpdateInput",
    fields: {
        title: { type: GraphQLString },
        subtitle: { type: GraphQLString },
        logopath: { type: GraphQLID },
        codeInjectionHead: { type: GraphQLString },
    },
});

const sitePaymentUpdateType = new GraphQLInputObjectType({
    name: "SitePaymentUpdateInput",
    fields: {
        currencyUnit: { type: GraphQLString },
        currencyISOCode: { type: GraphQLString },
        paymentMethod: { type: GraphQLString },
        stripePublishableKey: { type: GraphQLString },
        stripeSecret: { type: GraphQLString },
        paytmSecret: { type: GraphQLString },
        paypalSecret: { type: GraphQLString },
    },
});

const domain = new GraphQLObjectType({
    name: "Domain",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        settings: { type: siteType },
        layout: { type: designTypes.layoutType },
        theme: { type: designTypes.themeType },
        links: { type: new GraphQLList(menuTypes.linkType) },
    },
});

export default {
    siteType,
    siteUpdateType,
    sitePaymentUpdateType,
    domain,
};
