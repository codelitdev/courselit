import { EventEmitter } from "node:events";

export type NotificationStreamAudience = "admin" | "learner";

export type NotificationStreamItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationStreamEvent = {
  audience: NotificationStreamAudience;
  schoolId: string;
  recipientId: string;
  notification: NotificationStreamItem;
};

type NotificationStreamListener = (event: NotificationStreamEvent) => void;

const notificationEvents = new EventEmitter();
notificationEvents.setMaxListeners(0);

export function publishNotification(event: NotificationStreamEvent) {
  notificationEvents.emit("notification", event);
}

export function subscribeToNotifications(
  target: Pick<NotificationStreamEvent, "audience" | "schoolId" | "recipientId">,
  listener: NotificationStreamListener,
) {
  const handler = (event: NotificationStreamEvent) => {
    if (
      event.audience === target.audience &&
      event.schoolId === target.schoolId &&
      event.recipientId === target.recipientId
    ) {
      listener(event);
    }
  };
  notificationEvents.on("notification", handler);
  return () => notificationEvents.off("notification", handler);
}
