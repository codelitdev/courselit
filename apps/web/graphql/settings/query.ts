import types from "./types";
import { getApikeys, getSiteInfo } from "./logic";
import { GraphQLList } from "graphql";
import GQLContext from "@models/GQLContext";

const queries = {
    getSiteInfo: {
        type: types.domain,
        resolve: (_: any, __: any, ctx: any) => getSiteInfo(ctx),
    },
    getApikeys: {
        type: new GraphQLList(types.apikeyType),
        args: {},
        resolve: (_: any, {}: any, context: GQLContext) => getApikeys(context),
    },
};

export default queries;
