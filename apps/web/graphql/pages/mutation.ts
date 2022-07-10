import { GraphQLNonNull } from "graphql";
import GQLContext from "../../models/GQLContext";
import { savePage } from "./logic";
import types from "./types";

export default {
    savePage: {
        type: types.page,
        args: {
            pageData: {
                type: new GraphQLNonNull(types.pageInputType),
            },
        },
        resolve: async (_: any, { pageData }: any, context: GQLContext) =>
            savePage(pageData, context),
    },
};
