const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  updateUser: {
    type: types.userType,
    args: {
      userData: {
        type: new graphql.GraphQLNonNull(types.userUpdateInput),
      },
    },
    resolve: async (root, { userData }, context) =>
      logic.updateUser(userData, context),
  },
};
