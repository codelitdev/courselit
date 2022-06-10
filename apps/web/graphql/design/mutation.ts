import { GraphQLNonNull, GraphQLString, GraphQLBoolean } from "graphql";
import GQLContext from "../../models/GQLContext";
import types from "./types";
import settingsTypes from "../settings/types";
import { addTheme, setTheme, removeTheme, setLayout } from "./logic";

export default {
    addTheme: {
        type: types.themeType,
        args: {
            theme: {
                type: new GraphQLNonNull(types.themeInputType),
            },
        },
        resolve: async (_: any, { theme }: any, context: GQLContext) =>
            addTheme(theme, context),
    },
    setTheme: {
        type: types.themeType,
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { name }: any, context: GQLContext) =>
            setTheme(name, context),
    },
    removeTheme: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { name }: any, context: GQLContext) =>
            removeTheme(name, context),
    },
    setLayout: {
        type: settingsTypes.domain,
        args: {
            layoutData: {
                type: new GraphQLNonNull(types.layoutInputType),
            },
        },
        resolve: async (_: any, { layoutData }: any, context: GQLContext) =>
            setLayout(layoutData, context),
    },
};
