const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getUser: {
    type: types.userType,
    args: {
      email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    },
    resolve: (root, { email }, context) => logic.getUser(email, context),
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
