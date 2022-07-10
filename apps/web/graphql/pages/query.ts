import { GraphQLNonNull, GraphQLString } from "graphql";
import GQLContext from "../../models/GQLContext";
import { getPage } from "./logic";
import types from "./types";

export default {
    getPage: {
        type: types.page,
        args: {
            id: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (_: any, { id }: { id: string }, ctx: GQLContext) =>
            getPage({ id, ctx }),
    },
};
