import {
  GraphQLNonNull,
  GraphQLString,
  GraphQLBoolean,
  GraphQLObjectType,
  GraphQLInputObjectType,
} from "graphql";

const themeType = new GraphQLObjectType({
  name: "Theme",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    active: { type: new GraphQLNonNull(GraphQLBoolean) },
    styles: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: GraphQLString },
  },
});

const themeInputType = new GraphQLInputObjectType({
  name: "ThemeInput",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    styles: { type: new GraphQLNonNull(GraphQLString) },
    url: { type: GraphQLString },
  },
});

const layoutType = new GraphQLObjectType({
  name: "Layout",
  fields: {
    layout: { type: GraphQLString },
  },
});

const layoutInputType = new GraphQLInputObjectType({
  name: "LayoutInput",
  fields: {
    layout: { type: new GraphQLNonNull(GraphQLString) },
  },
});

export default {
  themeType,
  themeInputType,
  layoutType,
  layoutInputType,
};
