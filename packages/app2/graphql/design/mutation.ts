import { GraphQLNonNull, GraphQLString, GraphQLBoolean } from "graphql";
import GQLContext from "../../models/GQLContext";
import types from "./types";
import { addTheme, setTheme, removeTheme, setLayout } from "./logic";

export default {
  addTheme: {
    type: types.themeType,
    args: {
      theme: {
        type: new GraphQLNonNull(types.themeInputType),
      },
    },
    resolve: async (_: any, { theme }: any, context: GQLContext) =>
      addTheme(theme, context),
  },
  setTheme: {
    type: types.themeType,
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve: async (_: any, { id }: any, context: GQLContext) =>
      setTheme(id, context),
  },
  removeTheme: {
    type: new GraphQLNonNull(GraphQLBoolean),
    args: {
      id: {
        type: new GraphQLNonNull(GraphQLString),
      },
    },
    resolve: async (_: any, { id }: any, context: GQLContext) =>
      removeTheme(id, context),
  },
  setLayout: {
    type: types.layoutType,
    args: {
      layoutData: {
        type: new GraphQLNonNull(types.layoutInputType),
      },
    },
    resolve: async (_: any, { layoutData }: any, context: GQLContext) =>
      setLayout(layoutData, context),
  },
};
