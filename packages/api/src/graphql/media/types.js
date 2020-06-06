const graphql = require("graphql");

const creatorMediaType = new graphql.GraphQLObjectType({
  name: "CreatorMedia",
  fields: {
    id: { type: graphql.GraphQLID },
    title: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
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
    title: { type: graphql.GraphQLString },
    altText: { type: graphql.GraphQLString },
  },
});

module.exports = {
  creatorMediaType,
  mediaUpdateType,
};
