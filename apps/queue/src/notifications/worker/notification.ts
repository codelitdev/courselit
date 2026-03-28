import { Worker } from "bullmq";
import redis from "../../redis";
import { logger } from "../../logger";
import { notificationEmitter } from "../utils/emitter";
import { captureError, getDomainId } from "../../observability/posthog";

const worker = new Worker(
    "notification",
    async (job) => {
        const notification = job.data;
        try {
            deliverInAppNotification(notification);
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "worker.notification",
                domainId: getDomainId(notification?.domain),
                context: {
                    queue_name: "notification",
                    job_id: String(job.id),
                },
            });
        }
    },
    { connection: redis },
);

export default worker;

function deliverInAppNotification(notification) {
    notificationEmitter.emit("newNotification", notification);
}
