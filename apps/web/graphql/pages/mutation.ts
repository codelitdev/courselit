import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { savePage, createPage, deletePage } from "./logic";
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
    createPage: {
        type: types.page,
        args: {
            name: {
                type: new GraphQLNonNull(GraphQLString),
            },
            pageId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (
            _: any,
            { name, pageId }: { name: string; pageId: string },
            context: GQLContext,
        ) => createPage({ context, name, pageId }),
    },
    deletePage: {
        type: new GraphQLNonNull(GraphQLBoolean),
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: async (_: any, { id }: { id: string }, context: GQLContext) =>
            deletePage(context, id),
    },
};
