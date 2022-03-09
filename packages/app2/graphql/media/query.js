const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getCreatorMedia: {
    type: new graphql.GraphQLList(types.mediaType),
    args: {
      offset: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLInt),
      },
      searchText: {
        type: graphql.GraphQLString,
      },
      mimeType: { type: new graphql.GraphQLList(graphql.GraphQLString) },
      privacy: { type: graphql.GraphQLString },
    },
    resolve: (root, { offset, searchText, mimeType, privacy }, context) =>
      logic.getCreatorMedia(offset, context, searchText, mimeType, privacy),
  },
};
