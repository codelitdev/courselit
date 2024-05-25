import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { updatePage, createPage, deletePage, publish } from "./logic";
import types from "./types";
import constants from "../../config/constants";
const { defaultPages } = constants;

export default {
    updatePage: {
        type: types.page,
        args: {
            pageData: {
                type: new GraphQLNonNull(types.pageInputType),
            },
        },
        resolve: async (_: any, { pageData }: any, context: GQLContext) =>
            updatePage(pageData, context),
    },
    publish: {
        type: types.page,
        args: {
            pageId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { pageId }: { pageId: string },
            context: GQLContext,
        ) => publish(pageId, context),
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
        resolve: async (
            _: any,
            { id }: { id: (typeof defaultPages)[number] },
            context: GQLContext,
        ) => deletePage(context, id),
    },
};
