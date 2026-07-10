import express from "express";
import { getInboundEmailProvider } from "./provider";
import { processInboundReply } from "./processor";
import { logger } from "../logger";
import { captureError, getDomainId } from "../observability/posthog";

const router: any = express.Router();

/**
 * POST /inbound-email
 * 
 * Universal inbound email webhook endpoint.
 * Accepts normalized payloads from any supported provider (SES, Postmark, Mailgun, SendGrid).
 * The provider auto-detection is based on the shape of the incoming JSON payload.
 */
router.post("/", async (req: express.Request, res: express.Response) => {
    try {
        const provider = getInboundEmailProvider(
            req.query.provider as string | undefined,
        );

        const parsed = provider.parse(req.body);
        if (!parsed) {
            logger.warn(
                { provider: provider.name },
                "Inbound email could not be parsed",
            );
            // Return 200 to prevent provider from retrying (bad payload)
            return res.status(200).json({ success: false, error: "Unparseable payload" });
        }

        logger.info(
            {
                provider: provider.name,
                from: parsed.from,
                to: parsed.to,
                subject: parsed.subject,
            },
            "Processing inbound email reply",
        );

        const result = await processInboundReply(parsed);

        if (!result.success) {
            logger.warn(
                { error: result.error, from: parsed.from },
                "Inbound email processing failed",
            );
        } else {
            logger.info(
                { from: parsed.from },
                "Inbound email reply processed successfully",
            );
        }

        // Always return 200 to prevent provider retries
        return res.status(200).json(result);
    } catch (err: any) {
        logger.error(err, "Inbound email route error");
        captureError({
            error: err,
            source: "route.inbound_email",
            domainId: getDomainId(),
            context: {
                path: req.path,
                method: req.method,
                route: "/inbound-email",
            },
        });
        // Return 200 to prevent provider retries
        return res.status(200).json({ success: false, error: "Internal error" });
    }
});

export default router;
