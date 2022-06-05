import { GraphQLNonNull, GraphQLString, GraphQLBoolean } from "graphql";
import types from "./types";
import { saveWidgetSettings, saveWidgetData, clearWidgetData } from "./logic";
import type GQLContext from "../../models/GQLContext";

export default {
    saveWidgetSettings: {
        type: types.widgetSettingsType,
        args: {
            widgetSettingsData: {
                type: new GraphQLNonNull(types.widgetSettingsInputType),
            },
        },
        resolve: async (_: any, { widgetSettingsData }: any, ctx: GQLContext) =>
            saveWidgetSettings(widgetSettingsData, ctx),
    },
    saveWidgetData: {
        type: GraphQLBoolean,
        args: {
            widgetData: {
                type: new GraphQLNonNull(types.widgetDataInputType),
            },
        },
        resolve: async (_: any, { widgetData }: any, ctx: GQLContext) =>
            saveWidgetData(widgetData, ctx),
    },
    clearWidgetData: {
        type: GraphQLBoolean,
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { name }: any, ctx: GQLContext) =>
            clearWidgetData(name, ctx),
    },
};
