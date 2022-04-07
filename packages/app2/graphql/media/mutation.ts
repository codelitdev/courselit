import { GraphQLNonNull } from "graphql";
import types from "./types";
import { updateMedia } from "./logic";
import GQLContext from "../../models/GQLContext";

export default {
  updateMedia: {
    type: types.mediaType,
    args: {
      mediaData: {
        type: new GraphQLNonNull(types.mediaUpdateType),
      },
    },
    resolve: async (_: any, { mediaData }: any, context: GQLContext) =>
      updateMedia(mediaData, context),
  },
};
