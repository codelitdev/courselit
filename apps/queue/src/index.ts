import express from "express";
import jobRoutes from "./job/routes";

// start workers
import "./domain/mail/worker";
import { startEmailAutomation } from "./start-email-automation";

const app = express();
app.use(express.json());

app.use("/job", jobRoutes);

startEmailAutomation();

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Queue server running at ${port}`);
});
