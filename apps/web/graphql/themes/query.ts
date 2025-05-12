import { GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import types from "./types";
import { getTheme, getThemes } from "./logic";

export default {
    getTheme: {
        type: types.themeType,
        args: {
            themeId: { type: GraphQLString },
        },
        resolve: (_: any, { themeId }: any, context: GQLContext) =>
            getTheme(context, themeId),
    },
    getThemes: {
        type: types.themesType,
        resolve: (_: any, __: any, context: GQLContext) => getThemes(context),
    },
};
