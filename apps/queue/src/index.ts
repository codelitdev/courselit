import express from "express";
import jobRoutes from "./job/routes";
import sseRoutes from "./sse/routes";
import inboundEmailRoutes from "./inbound-email/routes";

// start loops
import { startEmailAutomation } from "./start-email-automation";
import { startSequenceWorker } from "./domain/process-ongoing-sequences";
import { startMailWorker } from "./domain/worker";
import { startNotificationWorker } from "./notifications/worker/notification";
import { startDispatchNotificationWorker } from "./notifications/worker/dispatch-notification";
import { verifyJWTMiddleware } from "./middlewares/verify-jwt";
import {
    captureError,
    getDomainId,
    setupPosthogExpressErrorHandler,
} from "./observability/posthog";
import { initPosthogLogs } from "./observability/logs";
import { logger } from "./logger";

const workers =
    process.env.NODE_ENV === "test"
        ? []
        : [
              startMailWorker(),
              startNotificationWorker(),
              startDispatchNotificationWorker(),
              startSequenceWorker(),
          ];

async function closeWorkers() {
    await Promise.allSettled(workers.map((worker) => worker.close()));
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
        closeWorkers()
            .catch((err) => {
                logger.error(err);
                captureError({
                    error: err,
                    source: "service.shutdown",
                    domainId: getDomainId(),
                });
            })
            .finally(() => {
                process.kill(process.pid, signal);
            });
    });
}

const app = express();
app.use(express.json());

app.use("/job", verifyJWTMiddleware, jobRoutes);
app.use("/sse", sseRoutes);
app.use("/inbound-email", inboundEmailRoutes);

app.get("/healthy", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

app.use((err, req: any, res, next) => {
    captureError({
        error: err,
        source: "express.uncaught",
        domainId: getDomainId(req?.user?.domain),
        context: {
            path: req?.path,
            method: req?.method,
        },
    });
    next(err);
});

setupPosthogExpressErrorHandler(app);

initPosthogLogs().catch((err) => {
    logger.error(err);
    captureError({
        error: err,
        source: "service.observability.logs_init",
        domainId: getDomainId(),
    });
});

startEmailAutomation().catch((err) => {
    logger.error(err);
    captureError({
        error: err,
        source: "service.startup",
        domainId: getDomainId(),
    });
});

const port = process.env.PORT || 80;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Queue server running at ${port}`);
});
