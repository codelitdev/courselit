import type { Job, Worker, WorkerOptions } from "bullmq";
import redis from "./redis";
import { logger } from "./logger";
import {
    captureError,
    captureEvent,
    getDomainId,
} from "./observability/posthog";

export const workerOptions: WorkerOptions = {
    connection: redis,
    lockDuration: 5 * 60 * 1000,
    stalledInterval: 30 * 1000,
    maxStalledCount: 2,
};

export function registerWorkerEvents(
    worker: Pick<Worker, "on">,
    queueName: string,
) {
    worker.on("ready", () => {
        captureEvent({
            event: "queue_worker_ready",
            source: `worker.${queueName}.ready`,
            domainId: getDomainId(),
            properties: {
                queue_name: queueName,
            },
        });
    });

    worker.on("closed", () => {
        captureEvent({
            event: "queue_worker_closed",
            source: `worker.${queueName}.closed`,
            domainId: getDomainId(),
            properties: {
                queue_name: queueName,
            },
        });
    });

    worker.on("failed", (job: Job | undefined, err: Error) => {
        const domainId = getDomainId(job?.data?.domainId || job?.data?.domain);
        logger.error(err);
        captureError({
            error: err,
            source: `worker.${queueName}.failed`,
            domainId,
            context: {
                queue_name: queueName,
                job_id: job?.id ? String(job.id) : undefined,
                job_name: job?.name,
                failed_reason: job?.failedReason,
                attempts_made: job?.attemptsMade,
            },
        });
    });

    worker.on("stalled", (jobId: string) => {
        const err = new Error(`BullMQ job stalled in ${queueName}: ${jobId}`);
        logger.error(err);
        captureError({
            error: err,
            source: `worker.${queueName}.stalled`,
            domainId: getDomainId(),
            context: {
                queue_name: queueName,
                job_id: jobId,
            },
        });
    });

    worker.on("error", (err: Error) => {
        logger.error(err);
        captureError({
            error: err,
            source: `worker.${queueName}.error`,
            domainId: getDomainId(),
            context: {
                queue_name: queueName,
            },
        });
    });
}
