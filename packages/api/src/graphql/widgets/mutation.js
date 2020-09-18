const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  saveWidgetSettings: {
    type: types.widgetSettingsType,
    args: {
      widgetSettingsData: {
        type: new graphql.GraphQLNonNull(types.widgetSettingsInputType),
      },
    },
    resolve: async (root, { widgetSettingsData }, ctx) =>
      logic.saveWidgetSettings(widgetSettingsData, ctx),
  },
  saveWidgetData: {
    type: graphql.GraphQLBoolean,
    args: {
      widgetData: {
        type: new graphql.GraphQLNonNull(types.widgetDataInputType),
      },
    },
    resolve: async (root, { widgetData }, ctx) =>
      logic.saveWidgetData(widgetData, ctx),
  },
  clearWidgetData: {
    type: graphql.GraphQLBoolean,
    args: {
      name: {
        type: new graphql.GraphQLNonNull(graphql.GraphQLString),
      },
    },
    resolve: async (root, { name }, ctx) => logic.clearWidgetData(name, ctx),
  },
};
