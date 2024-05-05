import express from "express";
import { addMailJob } from "../domain/handler";
import { logger } from "../logger";
import { MailJob } from "../domain/model/mail-job";

const router = express.Router();

router.post("/mail", async (req: express.Request, res: express.Response) => {
    try {
        const { to, from, subject, body } = req.body;
        MailJob.parse({ to, from, subject, body });

        await addMailJob({ to, from, subject, body });

        res.status(200).json({ message: "Success" });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
