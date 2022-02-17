const graphql = require("graphql");

const mediaType = new graphql.GraphQLObjectType({
  name: "Media",
  fields: {
    id: { type: graphql.GraphQLID },
    file: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    thumbnail: { type: graphql.GraphQLString },
    originalFileName: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
    },
    mimeType: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    size: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    caption: { type: graphql.GraphQLString },
    public: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    key: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
  },
});

const mediaUpdateType = new graphql.GraphQLInputObjectType({
  name: "MediaUpdateInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    caption: { type: graphql.GraphQLString },
    public: { type: graphql.GraphQLString },
  },
});

module.exports = {
  mediaType,
  mediaUpdateType,
};
