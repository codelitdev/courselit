import { logger } from "../../logger";
import { getDueOngoingSequences } from "../queries";
import { Worker } from "bullmq";
import redis from "../../redis";
import sequenceQueue from "../sequence-queue";
import { processOngoingSequence } from "./process-ongoing-sequence";

if (process.env.NODE_ENV !== "test") {
    new Worker(
        "sequence",
        async (job) => {
            const ongoingSequenceId = job.data;
            try {
                await processOngoingSequence(ongoingSequenceId);
            } catch (err: any) {
                logger.error(err);
            }
        },
        { connection: redis },
    );
}

export async function processOngoingSequences(): Promise<void> {
    if (!process.env.PIXEL_SIGNING_SECRET) {
        throw new Error(
            "PIXEL_SIGNING_SECRET environment variable is not defined",
        );
    }
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of ongoing sequence at ${new Date().toDateString()}`,
        );

        const dueOngoingSequences = await getDueOngoingSequences();
        for (const ongoingSequence of dueOngoingSequences) {
            sequenceQueue.add("sequence", ongoingSequence.id);
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}
