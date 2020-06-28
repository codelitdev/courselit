const types = require("./types.js");
const graphql = require("graphql");
const logic = require("./logic.js");

module.exports = {
  addTheme: {
    type: types.themeType,
    args: {
      theme: {
        type: new graphql.GraphQLNonNull(types.themeInputType),
      },
    },
    resolve: async (root, { theme }, context) => logic.addTheme(theme, context),
  },
  setTheme: {
    type: types.themeType,
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      },
    },
    resolve: async (root, { id }, context) => logic.setTheme(id, context),
  },
};
