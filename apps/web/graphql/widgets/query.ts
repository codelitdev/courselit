import { GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import { getWidgetSettings, getWidgetData, getSiteWidgets } from "./logic";
import type GQLContext from "../../models/GQLContext";

export default {
    getWidgetSettings: {
        type: types.widgetSettingsType,
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { name }: any, ctx: GQLContext) =>
            getWidgetSettings(name, ctx),
    },
    getWidgetData: {
        type: types.widgetDataType,
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { name }: any, ctx: GQLContext) =>
            getWidgetData(name, ctx),
    },
    getSiteWidgetsSettings: {
        type: types.siteWidgetsSettings,
        resolve: (_: any, __: any, context: GQLContext) =>
            getSiteWidgets(context),
    },
};
