import { config as loadDotFile } from "dotenv";
loadDotFile({ path: `.env.${process.env.NODE_ENV || "local"}` });

import express from "express";
import jobRoutes from "./job/routes";

// start workers
import "./domain/mail/worker";

const app = express();
app.use(express.json());

app.use("/job", jobRoutes);

const port = process.env.PORT || 80;
app.listen(port, () => {
    console.log(`Queue server running at ${port}`);
});
