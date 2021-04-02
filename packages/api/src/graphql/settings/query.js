// const graphql = require('graphql')
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getSiteInfo: {
    type: types.siteType,
    resolve: (root, _, ctx) => logic.getSiteInfo(ctx),
  },
  getSiteInfoAsAdmin: {
    type: types.siteAdminType,
    resolve: (root, _, ctx) => logic.getSiteInfoAsAdmin(ctx),
  },
};
