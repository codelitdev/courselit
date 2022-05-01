const graphql = require("graphql");
const types = require("./types");
const logic = require("./logic.js");

module.exports = {
  getUserPurchases: {
    type: types.userPurchasesType,
    args: {
      offset: { type: graphql.GraphQLInt },
    },
    resolve: (root, { offset }, context) =>
      logic.getUserPurchases(context, offset),
  },
};
