import {
  GraphQLObjectType,
  // GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  // GraphQLBoolean,
  // GraphQLInt,
  // GraphQLList,
  GraphQLInputObjectType
} from "graphql";
const { mediaType } = require("../media/types");
const mediaLogic = require("../media/logic.js");

const siteType = new GraphQLObjectType({
  name: "SiteInfo",
  fields: {
    title: { type: GraphQLString },
    subtitle: { type: GraphQLString },
    logopath: {
      type: mediaType,
      resolve: (settings, _, context, __) =>
        mediaLogic.getMedia(settings.logopath, context),
    },
    currencyUnit: { type: GraphQLString },
    currencyISOCode: { type: GraphQLString },
    paymentMethod: { type: GraphQLString },
    stripePublishableKey: { type: GraphQLString },
    codeInjectionHead: { type: GraphQLString },
  },
});

const siteAdminType = new GraphQLObjectType({
  name: "SiteInfoAdmin",
  fields: {
    title: { type: GraphQLString },
    subtitle: { type: GraphQLString },
    logopath: {
      type: mediaType,
      resolve: (settings, _, context, __) =>
        mediaLogic.getMedia(settings.logopath, context),
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

export default {
  siteType,
  siteAdminType,
  siteUpdateType,
  sitePaymentUpdateType,
};
