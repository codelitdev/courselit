const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  updateMedia: {
    type: types.creatorMediaType,
    args: {
      mediaData: {
        type: new graphql.GraphQLNonNull(types.mediaUpdateType),
      },
    },
    resolve: async (root, { mediaData }, context) =>
      logic.updateMedia(mediaData, context),
  },
};
