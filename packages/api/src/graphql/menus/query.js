const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getMenu: {
    type: new graphql.GraphQLList(types.publicLinkType),
    resolve: (root, _, ctx) => logic.getMenu(ctx),
  },
  getMenuAsAdmin: {
    type: new graphql.GraphQLList(types.linkType),
    resolve: (root, _, ctx) => logic.getMenuAsAdmin(ctx),
  },
};
