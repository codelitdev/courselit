import { Constants } from "@courselit/common-models";
import { GraphQLEnumType } from "graphql";

export const notificationPreferenceActivityType = new GraphQLEnumType({
    name: "NotificationPreferenceActivityType",
    values: Object.fromEntries(
        Object.entries(Constants.ActivityType).map(([key, value]) => [
            key,
            { value },
        ]),
    ),
});

export const notificationChannelType = new GraphQLEnumType({
    name: "NotificationChannelType",
    values: Object.fromEntries(
        Object.entries(Constants.NotificationChannel).map(([key, value]) => [
            key,
            { value },
        ]),
    ),
});
