const graphql = require("graphql");

const siteType = new graphql.GraphQLObjectType({
  name: "SiteInfo",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLString },
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    themePrimaryColor: { type: graphql.GraphQLString },
    themeSecondaryColor: { type: graphql.GraphQLString },
    codeInjectionHead: { type: graphql.GraphQLString },
  },
});

const siteAdminType = new graphql.GraphQLObjectType({
  name: "SiteInfoAdmin",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLString },
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    themePrimaryColor: { type: graphql.GraphQLString },
    themeSecondaryColor: { type: graphql.GraphQLString },
    codeInjectionHead: { type: graphql.GraphQLString },
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString },
  },
});

const siteUpdateType = new graphql.GraphQLInputObjectType({
  name: "SiteInfoUpdateInput",
  fields: {
    title: { type: graphql.GraphQLString },
    subtitle: { type: graphql.GraphQLString },
    logopath: { type: graphql.GraphQLString },
    currencyUnit: { type: graphql.GraphQLString },
    currencyISOCode: { type: graphql.GraphQLString },
    paymentMethod: { type: graphql.GraphQLString },
    stripePublishableKey: { type: graphql.GraphQLString },
    themePrimaryColor: { type: graphql.GraphQLString },
    themeSecondaryColor: { type: graphql.GraphQLString },
    codeInjectionHead: { type: graphql.GraphQLString },
    stripeSecret: { type: graphql.GraphQLString },
    paytmSecret: { type: graphql.GraphQLString },
    paypalSecret: { type: graphql.GraphQLString },
  },
});

module.exports = {
  siteType,
  siteAdminType,
  siteUpdateType,
};
