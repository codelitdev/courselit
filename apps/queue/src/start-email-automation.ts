import { connectToDatabase } from "./db";
import { processDrip } from "./domain/process-drip";
import { processOngoingSequences } from "./domain/process-ongoing-sequences";
import { processRules } from "./domain/process-rules";
import { captureError, getDomainId } from "./observability/posthog";
import { logger } from "./logger";

export async function startEmailAutomation() {
    try {
        await connectToDatabase();
    } catch (err: any) {
        logger.error(err);
        captureError({
            error: err,
            source: "startEmailAutomation.bootstrap",
            domainId: getDomainId(),
        });
        throw err;
    }

    processOngoingSequences().catch((err) => {
        logger.error(err);
        captureError({
            error: err,
            source: "processOngoingSequences.loop",
            domainId: getDomainId(),
        });
    });
    processRules().catch((err) => {
        logger.error(err);
        captureError({
            error: err,
            source: "processRules.loop",
            domainId: getDomainId(),
        });
    });
    processDrip().catch((err) => {
        logger.error(err);
        captureError({
            error: err,
            source: "processDrip.loop",
            domainId: getDomainId(),
        });
    });
}
