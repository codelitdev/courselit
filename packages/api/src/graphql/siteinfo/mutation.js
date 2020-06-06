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
};
