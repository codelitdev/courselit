const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getPublicNavigation: {
    type: new graphql.GraphQLList(types.publicLinkType),
    resolve: () => logic.getPublicNavigation(),
  },
  getNavigation: {
    type: new graphql.GraphQLList(types.linkType),
    resolve: (root, _, ctx) => logic.getNavigation(ctx),
  },
};
