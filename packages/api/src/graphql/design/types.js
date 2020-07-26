const graphql = require("graphql");

const themeType = new graphql.GraphQLObjectType({
  name: "Theme",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    active: { type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean) },
    styles: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    url: { type: graphql.GraphQLString },
  },
});

const themeInputType = new graphql.GraphQLInputObjectType({
  name: "ThemeInput",
  fields: {
    id: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    styles: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    url: { type: graphql.GraphQLString },
  },
});

const layoutType = new graphql.GraphQLObjectType({
  name: "Layout",
  fields: {
    layout: { type: graphql.GraphQLString },
  },
});

const layoutInputType = new graphql.GraphQLInputObjectType({
  name: "LayoutInput",
  fields: {
    layout: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
  },
});

module.exports = {
  themeType,
  themeInputType,
  layoutType,
  layoutInputType,
};
