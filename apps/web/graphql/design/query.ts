import { GraphQLList } from "graphql";
import GQLContext from "../../models/GQLContext";
import types from "./types";
import { getThemes } from "./logic";

export default {
    getThemes: {
        type: new GraphQLList(types.themeType),
        resolve: (_: any, { a = {} }: any, context: GQLContext) =>
            getThemes(context),
    },
};
