const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getTheme: {
    type: types.themeType,
    resolve: (root, _, context) => logic.getTheme(context),
  },
  getAllThemes: {
    type: new graphql.GraphQLList(types.themeType),
    resolve: (root, { a = {} }, context) => logic.getAllThemes(context),
  },
  getLayout: {
    type: types.layoutType,
    resolve: (root, _, context) => logic.getLayout(context),
  },
};
