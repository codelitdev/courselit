import GQLContext from "@models/GQLContext";
import {
    markAllAsRead,
    markAsRead,
    updateNotificationPreference,
} from "./logic";
import {
    GraphQLBoolean,
    GraphQLList,
    GraphQLNonNull,
    GraphQLString,
} from "graphql";
import {
    notificationChannelType,
    notificationPreferenceActivityType,
} from "./enums";
import { ActivityType, NotificationChannel } from "@courselit/common-models";
import types from "./types";

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
    updateNotificationPreference: {
        type: types.notificationPreference,
        args: {
            activityType: {
                type: new GraphQLNonNull(notificationPreferenceActivityType),
            },
            channels: {
                type: new GraphQLNonNull(
                    new GraphQLList(
                        new GraphQLNonNull(notificationChannelType),
                    ),
                ),
            },
        },
        resolve: async (
            _: any,
            {
                activityType,
                channels,
            }: {
                activityType: ActivityType;
                channels: NotificationChannel[];
            },
            ctx: GQLContext,
        ) => updateNotificationPreference({ ctx, activityType, channels }),
    },
};

export default mutations;
