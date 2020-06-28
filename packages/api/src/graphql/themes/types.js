const graphql = require("graphql");

const themeType = new graphql.GraphQLObjectType({
  name: "Theme",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    active: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    layout: { type: graphql.GraphQLString },
    styles: { type: graphql.GraphQLString },
    screenshot: { type: graphql.GraphQLString },
    url: { type: graphql.GraphQLString },
  },
});

const themeInputType = new graphql.GraphQLInputObjectType({
  name: "ThemeInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    layout: { type: graphql.GraphQLString },
    styles: { type: graphql.GraphQLString },
    screenshot: { type: graphql.GraphQLString },
    url: { type: graphql.GraphQLString },
  },
});

module.exports = {
  themeType,
  themeInputType,
};
