const graphql = require("graphql");
const { mediaType } = require("../media/types");
const mediaLogic = require("../media/logic.js");

const siteType = new graphql.GraphQLObjectType({
  name: "SiteInfo",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: {
      type: mediaType,
      resolve: (settings, _, context, __) =>
        mediaLogic.getMedia(settings.logopath, context),
    },
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    codeInjectionHead: { type: graphql.GraphQLString },
  },
});

const siteAdminType = new graphql.GraphQLObjectType({
  name: "SiteInfoAdmin",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: {
      type: mediaType,
      resolve: (settings, _, context, __) =>
        mediaLogic.getMedia(settings.logopath, context),
    },
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    codeInjectionHead: { type: graphql.GraphQLString },
  },
});

const siteUpdateType = new graphql.GraphQLInputObjectType({
  name: "SiteInfoUpdateInput",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLID },
    codeInjectionHead: { type: graphql.GraphQLString },
  },
});

const sitePaymentUpdateType = new graphql.GraphQLInputObjectType({
  name: "SitePaymentUpdateInput",
  fields: {
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString },
  },
});

module.exports = {
  siteType,
  siteAdminType,
  siteUpdateType,
  sitePaymentUpdateType,
};
