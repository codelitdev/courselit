const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  updateSiteInfo: {
    type: types.siteAdminType,
    args: {
      siteData: {
        type: new graphql.GraphQLNonNull(types.siteUpdateType),
      },
    },
    resolve: async (root, { siteData }, context) =>
      logic.updateSiteInfo(siteData, context),
  },
  updatePaymentInfo: {
    type: types.siteAdminType,
    args: {
      siteData: {
        type: new graphql.GraphQLNonNull(types.sitePaymentUpdateType),
      },
    },
    resolve: async (root, { siteData }, context) =>
      logic.updatePaymentInfo(siteData, context),
  },
};
