// const graphql = require('graphql')
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getSiteInfo: {
    type: types.siteType,
    resolve: () => logic.getSiteInfo(),
  },
  getSiteInfoAsAdmin: {
    type: types.siteAdminType,
    resolve: (root, _, ctx) => logic.getSiteInfoAsAdmin(ctx),
  },
};
