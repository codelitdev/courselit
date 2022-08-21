import { GraphQLList, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { getPage, getPages } from "./logic";
import types from "./types";

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
        resolve: (_: any, __: any, ctx: GQLContext) => getPages(ctx),
    },
};
