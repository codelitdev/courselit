const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getCreatorMedia: {
    type: new graphql.GraphQLList(types.creatorMediaType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
      },
      searchText: {
        type: graphql.GraphQLString,
      },
    },
    resolve: (root, { offset, searchText }, context) =>
      logic.getCreatorMedia(offset, context, searchText),
  },
};
