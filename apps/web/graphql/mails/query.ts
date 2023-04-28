import {
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import types from "./types.ts";
import { getMail, getMails, getMailsCount } from "./logic.ts";
import SearchData from "./models/search-data";

export default {
    getMail: {
        type: types.mail,
        args: {
            mailId: {
                type: new GraphQLNonNull(GraphQLString),
            },
        },
        resolve: (
            _: any,
            { mailId }: { mailId: string },
            context: GQLContext
        ) => getMail(mailId, context),
    },
    getMails: {
        type: new GraphQLList(types.mail),
        args: {
            searchData: { type: types.mailSearchInput },
        },
        resolve: (
            _: any,
            { searchData }: { searchData: SearchData },
            context: GQLContext
        ) => getMails(searchData, context),
    },
    getMailsCount: {
        type: new GraphQLNonNull(GraphQLInt),
        args: {
            searchData: { type: types.mailSearchInput },
        },
        resolve: (_: any, { searchData }: any, context: GQLContext) =>
            getMailsCount(searchData, context),
    },
};
