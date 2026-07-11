import { Worker } from "bullmq";
import { logger } from "../../logger";
import { notificationEmitter } from "../utils/emitter";
import { captureError, getDomainId } from "../../observability/posthog";
import { registerWorkerEvents, workerOptions } from "../../bullmq";

export function startNotificationWorker() {
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
                throw err;
            }
        },
        workerOptions,
    );

    registerWorkerEvents(worker, "notification");

    return worker;
}

function deliverInAppNotification(notification) {
    notificationEmitter.emit("newNotification", notification);
}
