import express from "express";
import jobRoutes from "./job/routes";
import sseRoutes from "./sse/routes";

// start workers
import "./domain/worker";
import "./notifications/worker/notification";
import "./notifications/worker/dispatch-notification";

// start loops
import { startEmailAutomation } from "./start-email-automation";
import { verifyJWTMiddleware } from "./middlewares/verify-jwt";
import {
    captureError,
    getDomainId,
    setupPosthogExpressErrorHandler,
} from "./observability/posthog";
import { initPosthogLogs } from "./observability/logs";
import { logger } from "./logger";

const app = express();
app.use(express.json());

app.use("/job", verifyJWTMiddleware, jobRoutes);
app.use("/sse", sseRoutes);

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
