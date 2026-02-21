import { ActivityType } from ".";
import { NotificationChannel } from "./notification-channel";

export interface NotificationPreference {
    userId: string;
    activityType: ActivityType;
    channels: NotificationChannel[];
}
