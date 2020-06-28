const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getTheme: {
    type: types.themeType,
    resolve: () => logic.getTheme(),
  },
  getAllThemes: {
    type: new graphql.GraphQLList(types.themeType),
    resolve: (root, { a = {} }, context) => logic.getAllThemes(context),
  },
};
