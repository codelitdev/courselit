const graphql = require("graphql");

const creatorMediaType = new graphql.GraphQLObjectType({
  name: "CreatorMedia",
  fields: {
    id: { type: graphql.GraphQLID },
    file: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    thumbnail: { type: graphql.GraphQLString },
    originalFileName: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLString),
    },
    mimeType: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    size: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) },
    altText: { type: graphql.GraphQLString },
  },
});

const mediaUpdateType = new graphql.GraphQLInputObjectType({
  name: "MediaUpdateInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    altText: { type: graphql.GraphQLString },
  },
});

module.exports = {
  creatorMediaType,
  mediaUpdateType,
};
