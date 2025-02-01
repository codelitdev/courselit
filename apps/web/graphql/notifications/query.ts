import GQLContext from "@models/GQLContext";
import { GraphQLInt, GraphQLString } from "graphql";
import { getNotification, getNotifications } from "./logic";
import types from "./types";

const queries = {
    getNotification: {
        type: types.notification,
        args: {
            notificationId: {
                type: GraphQLString,
            },
        },
        resolve: (
            _: any,
            { notificationId }: { notificationId: string },
            ctx: GQLContext,
        ) => getNotification({ ctx, notificationId }),
    },
    getNotifications: {
        type: types.notifications,
        args: {
            page: {
                type: GraphQLInt,
            },
            limit: {
                type: GraphQLInt,
            },
        },
        resolve: (
            _: any,
            { page, limit }: { page?: number; limit?: number },
            ctx: GQLContext,
        ) => getNotifications({ ctx, page, limit }),
    },
};

export default queries;
