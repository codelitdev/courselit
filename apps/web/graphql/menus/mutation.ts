import { GraphQLNonNull, GraphQLID, GraphQLBoolean } from "graphql";
import types from "./types";
import { saveLink, deleteLink } from "./logic";
import type GQLContext from "../../models/GQLContext";

export default {
  saveLink: {
    type: types.linkType,
    args: {
      linkData: {
        type: new GraphQLNonNull(types.linkInputType),
      },
    },
    resolve: async (_: any, { linkData }: any, context: GQLContext) =>
      saveLink(linkData, context),
  },
  deleteLink: {
    type: GraphQLBoolean,
    args: {
      id: { type: new GraphQLNonNull(GraphQLID) },
    },
    resolve: async (_: any, { id }: any, context: GQLContext) =>
      deleteLink(id, context),
  },
};
