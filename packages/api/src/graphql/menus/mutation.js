const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  saveLink: {
    type: types.linkType,
    args: {
      linkData: {
        type: new graphql.GraphQLNonNull(types.linkInputType),
      },
    },
    resolve: async (root, { linkData }, context) =>
      logic.saveLink(linkData, context),
  },
  deleteLink: {
    type: graphql.GraphQLBoolean,
    args: {
      id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    },
    resolve: async (root, { id }, context) => logic.deleteLink(id, context),
  },
};
