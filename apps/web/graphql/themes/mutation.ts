import { GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import { GraphQLJSONObject } from "graphql-type-json";
import { ThemeStyle } from "@courselit/page-models";
import { switchTheme, updateDraftTheme } from "./logic";
import GQLContext from "@models/GQLContext";

export default {
    updateDraftTheme: {
        type: types.themeType,
        args: {
            themeId: { type: new GraphQLNonNull(GraphQLString) },
            colors: { type: GraphQLJSONObject },
            typography: { type: GraphQLJSONObject },
            interactives: { type: GraphQLJSONObject },
            structure: { type: GraphQLJSONObject },
        },
        resolve: async (
            _: any,
            {
                themeId,
                colors,
                typography,
                interactives,
                structure,
            }: {
                themeId: string;
                colors?: ThemeStyle["colors"];
                typography?: ThemeStyle["typography"];
                interactives?: ThemeStyle["interactives"];
                structure?: ThemeStyle["structure"];
            },
            context: GQLContext,
        ) =>
            updateDraftTheme(
                themeId,
                context,
                colors,
                typography,
                interactives,
                structure,
            ),
    },
    switchTheme: {
        type: types.themeType,
        args: {
            themeId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (_: any, { themeId }: any, context: GQLContext) =>
            switchTheme(themeId, context),
    },
};
