import { logger } from "../../logger";
import { getDueOngoingSequences } from "../queries";
import { Worker } from "bullmq";
import redis from "../../redis";
import sequenceQueue from "../sequence-queue";
import { processOngoingSequence } from "./process-ongoing-sequence";
import { captureError, getDomainId } from "../../observability/posthog";

interface SequenceWorkerData {
    ongoingSequenceId: string;
    domainId?: string;
}

if (process.env.NODE_ENV !== "test") {
    new Worker(
        "sequence",
        async (job) => {
            const payload = job.data as SequenceWorkerData | string;
            const ongoingSequenceId =
                typeof payload === "string"
                    ? payload
                    : payload.ongoingSequenceId;
            const domainId =
                typeof payload === "string"
                    ? getDomainId()
                    : getDomainId(payload.domainId);
            try {
                await processOngoingSequence(ongoingSequenceId);
            } catch (err: any) {
                logger.error(err);
                captureError({
                    error: err,
                    source: "worker.sequence",
                    domainId,
                    context: {
                        queue_name: "sequence",
                        job_id: String(job.id),
                        ongoing_sequence_id: String(ongoingSequenceId),
                    },
                });
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
        try {
            // eslint-disable-next-line no-console
            console.log(
                `Starting process of ongoing sequence at ${new Date().toDateString()}`,
            );

            const dueOngoingSequences = await getDueOngoingSequences();
            for (const ongoingSequence of dueOngoingSequences) {
                try {
                    await sequenceQueue.add("sequence", {
                        ongoingSequenceId: String(ongoingSequence.id),
                        domainId: getDomainId(ongoingSequence.domain),
                    });
                } catch (err: any) {
                    logger.error(err);
                    captureError({
                        error: err,
                        source: "processOngoingSequences.enqueue",
                        domainId: getDomainId(ongoingSequence.domain),
                        context: {
                            queue_name: "sequence",
                            ongoing_sequence_id: String(ongoingSequence.id),
                        },
                    });
                }
            }
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "processOngoingSequences.loop",
                domainId: getDomainId(),
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}
