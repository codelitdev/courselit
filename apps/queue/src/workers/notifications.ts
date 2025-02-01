import { Worker } from "bullmq";
import redis from "../redis";
import { logger } from "../logger";
import { notificationEmitter } from "../domain/emitters/notification";

const worker = new Worker(
    "notification",
    async (job) => {
        const notification = job.data;
        try {
            deliverInAppNotification(notification);
        } catch (err: any) {
            logger.error(err);
        }
    },
    { connection: redis },
);

export default worker;

function deliverInAppNotification(notification) {
    notificationEmitter.emit("newNotification", notification);
}
