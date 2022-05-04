import { GraphQLList } from "graphql";
import types from "./types";
import { getMenu, getMenuAsAdmin } from "./logic";
import type GQLContext from "../../models/GQLContext";

module.exports = {
  getMenu: {
    type: new GraphQLList(types.publicLinkType),
    resolve: (_: any, __: any, context: GQLContext) => getMenu(context),
  },
  getMenuAsAdmin: {
    type: new GraphQLList(types.linkType),
    resolve: (_: any, __: any, context: GQLContext) => getMenuAsAdmin(context),
  },
};
