const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  getWidgetSettings: {
    type: types.widgetSettingsType,
    args: {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      },
    },
    resolve: (root, { name }, ctx) => logic.getWidgetSettings(name, ctx),
  },
  getWidgetData: {
    type: types.widgetDataType,
    args: {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      },
    },
    resolve: (root, { name }, ctx) => logic.getWidgetData(name, ctx),
  },
};
