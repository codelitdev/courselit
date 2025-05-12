import { GraphQLNonNull, GraphQLString } from "graphql";
import types from "./types";
import { GraphQLJSONObject } from "graphql-type-json";
import { Theme } from "@courselit/common-models";

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
                colors?: Theme["colors"];
                typography?: Theme["typography"];
                interactives?: Theme["interactives"];
                structure?: Theme["structure"];
            },
            context: any,
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
    // switchTheme: {
    //     type: types.themeType,
    //     args: {
    //         themeId: {
    //             type: new GraphQLNonNull(GraphQLString),
    //         },
    //     },
    //     resolve: async (_: any, { themeId }: any, context: GQLContext) =>
    //         switchTheme(themeId, context),
    // },
    // updateTheme: {
    //     type: types.themeType,
    //     args: {
    //         themeId: {
    //             type: new GraphQLNonNull(GraphQLString),
    //         },
    //         name: {
    //             type: GraphQLString,
    //         },
    //     },
    //     resolve: async (_: any, { themeId, name }: any, context: GQLContext) =>
    //         updateTheme(themeId, name, context),
    // },
    // deleteTheme: {
    //     type: new GraphQLNonNull(GraphQLBoolean),
    //     args: {
    //         themeId: {
    //             type: new GraphQLNonNull(GraphQLString),
    //         },
    //     },
    //     resolve: async (_: any, { themeId }: any, context: GQLContext) =>
    //         deleteTheme(themeId, context),
    // },
};
