import {
  GraphQLObjectType,
  // GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  // GraphQLBoolean,
  // GraphQLInt,
  // GraphQLList,
  GraphQLInputObjectType,
} from "graphql";
import mediaTypes from "../media/types";
import { getMedia } from "../media/logic";
const { mediaType } = mediaTypes;

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

const siteAdminType = new GraphQLObjectType({
  name: "SiteInfoAdmin",
  fields: {
    title: { type: GraphQLString },
    subtitle: { type: GraphQLString },
    logopath: {
      type: mediaType,
      resolve: (settings, _, __, ___) => getMedia(settings.logopath),
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
