import GQLContext from "@models/GQLContext";
import { markAllAsRead, markAsRead } from "./logic";
import { GraphQLBoolean, GraphQLNonNull, GraphQLString } from "graphql";

const mutations = {
    markAsRead: {
        type: GraphQLBoolean,
        args: {
            notificationId: { type: new GraphQLNonNull(GraphQLString) },
        },
        resolve: async (
            _: any,
            { notificationId }: { notificationId: string },
            ctx: GQLContext,
        ) => markAsRead({ ctx, notificationId }),
    },
    markAllAsRead: {
        type: GraphQLBoolean,
        resolve: async (_: any, __: any, ctx: GQLContext) => markAllAsRead(ctx),
    },
};

export default mutations;
