import {
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  GraphQLInt
} from 'graphql';
import types from './types';
import { getCreatorMedia } from './logic';
import GQLContext from '../../models/GQLContext';

export default {
  getCreatorMedia: {
    type: new GraphQLList(types.mediaType),
    args: {
      offset: {
        type: new GraphQLNonNull(GraphQLInt),
      },
      searchText: {
        type: GraphQLString,
      },
      mimeType: { type: new GraphQLList(GraphQLString) },
      privacy: { type: GraphQLString },
    },
    resolve: (_: any, { offset, searchText, mimeType, privacy }: any, context: GQLContext) =>
      getCreatorMedia(offset, context, searchText, mimeType, privacy),
  },
};
