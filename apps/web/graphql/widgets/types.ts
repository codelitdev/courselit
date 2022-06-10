import {
    GraphQLInputObjectType,
    GraphQLString,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLList,
} from "graphql";

const widgetSettingsType = new GraphQLObjectType({
    name: "WidgetSettings",
    fields: {
        name: { type: GraphQLString },
        settings: { type: GraphQLString },
    },
});

const siteWidgetsSettings = new GraphQLList(widgetSettingsType);

const widgetDataType = new GraphQLObjectType({
    name: "WidgetData",
    fields: {
        data: { type: GraphQLString },
    },
});

const widgetSettingsInputType = new GraphQLInputObjectType({
    name: "WidgetSettingsInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        settings: { type: GraphQLString },
    },
});

const widgetDataInputType = new GraphQLInputObjectType({
    name: "WidgetDataInput",
    fields: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        data: { type: new GraphQLNonNull(GraphQLString) },
    },
});

export default {
    widgetSettingsType,
    widgetDataType,
    widgetSettingsInputType,
    widgetDataInputType,
    siteWidgetsSettings,
};
