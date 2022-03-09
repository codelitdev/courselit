import {
  GraphQLString
} from "graphql";
import types from './types';
import { getUser } from './logic';

export default {
  getUser: {
    type: types.userType,
    args: {
      email: { type: GraphQLString },
      userId: { type: GraphQLString },
    },
    resolve: (_: any, { email, userId }: any, context: any) =>
      getUser(email, userId, context),
  },
  // getSiteUsers: {
  //   type: new GraphQLList(types.userType),
  //   args: {
  //     searchData: { type: types.userSearchInput },
  //   },
  //   resolve: (root, { searchData }, context) =>
  //     logic.getSiteUsers(searchData, context),
  // },
};
