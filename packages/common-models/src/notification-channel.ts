import { Constants } from ".";

export type NotificationChannel =
    (typeof Constants.NotificationChannel)[keyof typeof Constants.NotificationChannel];
