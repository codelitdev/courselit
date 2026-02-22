import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLInt,
    GraphQLList,
    GraphQLObjectType,
    GraphQLString,
} from "graphql";

const notification = new GraphQLObjectType({
    name: "Notification",
    fields: {
        notificationId: { type: GraphQLString },
        message: { type: GraphQLString },
        href: { type: GraphQLString },
        read: { type: GraphQLBoolean },
        createdAt: { type: GraphQLFloat },
    },
});

const notifications = new GraphQLObjectType({
    name: "Notifications",
    fields: {
        notifications: { type: new GraphQLList(notification) },
        total: { type: GraphQLInt },
    },
});

const notificationPreference = new GraphQLObjectType({
    name: "NotificationPreference",
    fields: {
        activityType: { type: GraphQLString },
        channels: { type: new GraphQLList(GraphQLString) },
    },
});

export default {
    notification,
    notifications,
    notificationPreference,
};
