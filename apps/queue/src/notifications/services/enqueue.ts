import dispatchNotificationQueue from "../queue/dispatch-notification";
import notificationQueue from "../queue/notification";

export async function addNotificationJob(notification) {
    await notificationQueue.add("notification", notification);
}

export async function addDispatchNotificationJob(notification) {
    await dispatchNotificationQueue.add("dispatch-notification", notification, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
    });
}
