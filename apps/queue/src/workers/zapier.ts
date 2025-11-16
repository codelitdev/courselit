import { Worker } from "bullmq";
import redis from "../redis";
import { logger } from "../logger";
import { ZapierJob } from "../domain/model/zapier-job";

const worker = new Worker(
    "zapier",
    async (job) => {
        const { domainId, action, payload } = job.data as ZapierJob;
        logger.info(`Processing zapier job for domain ${domainId}`, {
            action,
            payload,
        });
    },
    {
        connection: redis,
    },
);

worker.on("completed", (job) => {
    logger.info(`Zapier job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
    logger.error(`Zapier job ${job.id} failed with error ${err.message}`);
});
