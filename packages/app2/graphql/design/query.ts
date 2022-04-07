import { GraphQLList } from "graphql";
import GQLContext from "../../models/GQLContext";
import types from "./types";
import { getTheme, getAllThemes, getLayout } from "./logic";

export default {
  getTheme: {
    type: types.themeType,
    resolve: (_: any, __: any, context: GQLContext) => getTheme(context),
  },
  getAllThemes: {
    type: new GraphQLList(types.themeType),
    resolve: (_: any, { a = {} }: any, context: GQLContext) =>
      getAllThemes(context),
  },
  getLayout: {
    type: types.layoutType,
    resolve: (_: any, __: any, context: GQLContext) => getLayout(context),
  },
};
