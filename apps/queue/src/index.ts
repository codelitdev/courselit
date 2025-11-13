import express from "express";
import jobRoutes from "./job/routes";
import sseRoutes from "./sse/routes";

// start workers
import "./domain/worker";
import "./workers/notifications";

// start loops
import { startEmailAutomation } from "./start-email-automation";
import { verifyJWTMiddleware } from "./middlewares/verify-jwt";

const app = express();
app.use(express.json());

app.use("/job", verifyJWTMiddleware, jobRoutes);
app.use("/sse", sseRoutes);

app.get("/healthy", (req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
});

startEmailAutomation();

const port = process.env.PORT || 80;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Queue server running at ${port}`);
});
