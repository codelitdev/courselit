const graphql = require("graphql");

const widgetSettingsType = new graphql.GraphQLObjectType({
  name: "WidgetSettings",
  fields: {
    settings: { type: graphql.GraphQLString },
    allowGuests: {
      type: new graphql.GraphQLNonNull(graphql.GraphQLBoolean),
    },
  },
});

const widgetDataType = new graphql.GraphQLObjectType({
  name: "WidgetData",
  fields: {
    data: { type: graphql.GraphQLString },
  },
});

const widgetSettingsInputType = new graphql.GraphQLInputObjectType({
  name: "WidgetSettingsInput",
  fields: {
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    settings: { type: graphql.GraphQLString },
    allowGuests: { type: graphql.GraphQLBoolean },
  },
});

const widgetDataInputType = new graphql.GraphQLInputObjectType({
  name: "WidgetDataInput",
  fields: {
    name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
    data: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
  },
});

module.exports = {
  widgetSettingsType,
  widgetDataType,
  widgetSettingsInputType,
  widgetDataInputType,
};
