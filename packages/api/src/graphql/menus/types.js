const graphql = require("graphql");

const publicLinkType = new graphql.GraphQLObjectType({
  name: "PublicLink",
  fields: {
    text: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    destination: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    category: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    newTab: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
  },
});

const linkType = new graphql.GraphQLObjectType({
  name: "Link",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLID) },
    text: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    destination: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    category: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    newTab: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
  },
});

const linkInputType = new graphql.GraphQLInputObjectType({
  name: "LinkInput",
  fields: {
    id: { type: graphql.GraphQLID },
    text: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    destination: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    category: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    newTab: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
  },
});

module.exports = {
  publicLinkType,
  linkType,
  linkInputType,
};
