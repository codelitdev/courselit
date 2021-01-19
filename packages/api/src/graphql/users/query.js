const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getUser: {
    type: types.userType,
    args: {
      email: { type: graphql.GraphQLString },
      userId: { type: graphql.GraphQLString },
    },
    resolve: (root, { email, userId }, context) =>
      logic.getUser(email, userId, context),
  },
  getSiteUsers: {
    type: new graphql.GraphQLList(types.userType),
    args: {
      searchData: { type: types.userSearchInput },
    },
    resolve: (root, { searchData }, context) =>
      logic.getSiteUsers(searchData, context),
  },
  getUsersSummary: {
    type: types.usersSummaryType,
    resolve: (root, { a = {} }, context) => logic.getUsersSummary(context),
  },
};
