import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { updatePage, createPage, deletePage, publish } from "./logic";
import types from "./types";
import constants from "../../config/constants";
const { defaultPages } = constants;
import mediaTypes from "../media/types";
import { Media } from "@courselit/common-models";
const { mediaInputType } = mediaTypes;

export default {
    updatePage: {
        type: types.page,
        args: {
            pageId: { type: new GraphQLNonNull(GraphQLString) },
            layout: { type: GraphQLString },
            title: { type: GraphQLString },
            description: { type: GraphQLString },
            socialImage: { type: mediaInputType },
            robotsAllowed: { type: GraphQLBoolean },
        },
        resolve: async (
            _: any,
            {
                pageId,
                layout,
                title,
                description,
                socialImage,
                robotsAllowed,
            }: {
                context: GQLContext;
                pageId: string;
                layout?: string;
                title?: string;
                description?: string;
                socialImage?: Media;
                robotsAllowed?: boolean;
            },
            context: GQLContext,
        ) =>
            updatePage({
                context,
                pageId,
                layout,
                title,
                description,
                socialImage,
                robotsAllowed,
            }),
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
