import { Worker } from "bullmq";
import redis from "../redis";
import { logger } from "../logger";
import { captureError, getDomainId } from "../observability/posthog";
import { sendMail } from "../mail";

const worker = new Worker(
    "mail",
    async (job) => {
        const { to, from, subject, body, headers, domainId } = job.data;

        try {
            await sendMail({
                from,
                to,
                subject,
                html: body,
                headers,
            });
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "worker.mail",
                domainId: getDomainId(domainId),
                context: {
                    queue_name: "mail",
                    job_id: String(job.id),
                    error_code: err?.code,
                    response_code: err?.responseCode,
                    command: err?.command,
                },
            });
        }
    },
    { connection: redis },
);

export default worker;
