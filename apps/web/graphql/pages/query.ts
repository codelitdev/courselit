import { GraphQLEnumType, GraphQLList, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { getPage, getPages } from "./logic";
import types from "./types";
import constants from "../../config/constants";
const { product, site, blogPage } = constants;

const pageType = new GraphQLEnumType({
    name: "PageType",
    values: {
        [product.toUpperCase()]: { value: product },
        [site.toUpperCase()]: { value: site },
        [blogPage.toUpperCase()]: { value: blogPage },
    },
});

export default {
    getPage: {
        type: types.page,
        args: {
            id: {
                type: GraphQLString,
            },
        },
        resolve: (_: any, { id }: { id: string }, ctx: GQLContext) =>
            getPage({ id, ctx }),
    },
    getPages: {
        type: new GraphQLList(types.page),
        args: {
            type: {
                type: pageType,
            },
        },
        resolve: (
            _: any,
            { type }: { type?: typeof product | typeof site | typeof blogPage },
            ctx: GQLContext,
        ) => getPages(ctx, type),
    },
};
