import express from "express";
import jobRoutes from "./job/routes";
import sseRoutes from "./sse/routes";
import { jwtUtils } from "@courselit/utils";

// start workers
import "./domain/worker";
import "./workers/notifications";

// start loops
import { startEmailAutomation } from "./start-email-automation";
import { logger } from "./logger";

const app = express();
app.use(express.json());

const verifyJWTMiddleware = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return res.status(401).json({ error: "No token provided" });
        }

        const secret = process.env.COURSELIT_JWT_SECRET;
        const decoded: any = jwtUtils.verifyToken(token, secret);
        if (!decoded) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = decoded.user;
        next();
    } catch (err) {
        logger.error(err);
        return res.status(500).json({ error: err.message });
    }
};

app.use("/job", verifyJWTMiddleware, jobRoutes);
app.use("/sse", sseRoutes);

app.get("/healthy", (req, res) => {
    res.status(200).json({ success: true });
});

startEmailAutomation();

const port = process.env.PORT || 80;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Queue server running at ${port}`);
});
