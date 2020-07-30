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
  removeTheme: {
    type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    args: {
      id: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      },
    },
    resolve: async (root, { id }, context) => logic.removeTheme(id, context),
  },
  setLayout: {
    type: types.layoutType,
    args: {
      layoutData: {
        type: new graphql.GraphQLNonNull(types.layoutInputType),
      },
    },
    resolve: async (root, { layoutData }, context) =>
      logic.setLayout(layoutData, context),
  },
};
