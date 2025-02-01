import { Constants } from ".";

const { NotificationEntityAction } = Constants;

export type NotificationEntityAction =
    (typeof NotificationEntityAction)[keyof typeof NotificationEntityAction];

export interface Notification {
    notificationId: string;
    message: string;
    href: string;
    read: boolean;
    createdAt: Date;
}
