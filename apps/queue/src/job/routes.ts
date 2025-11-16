import express from "express";
import { addMailJob, addNotificationJob, addZapierJob } from "../domain/handler";
import { logger } from "../logger";
import { MailJob } from "../domain/model/mail-job";
import { ZapierJob } from "../domain/model/zapier-job";
import NotificationModel from "../domain/model/notification";
import { ObjectId } from "mongodb";
import { User } from "@courselit/common-models";

const router: any = express.Router();

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

router.post(
    "/notification",
    async (
        req: express.Request & { user: User & { domain: string } },
        res: express.Response,
    ) => {
        const { user } = req;

        try {
            const { forUserIds, entityAction, entityId, entityTargetId } =
                req.body;

            for (const forUserId of forUserIds) {
                // @ts-ignore - Mongoose type compatibility issue
                const notification = await NotificationModel.create({
                    domain: new ObjectId(user.domain),
                    userId: user.userId,
                    forUserId,
                    entityAction,
                    entityId,
                    entityTargetId,
                });

                await addNotificationJob(notification);
            }

            res.status(200).json({ message: "Success" });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: err.message });
        }
    },
);

router.post("/zapier", async (req: express.Request, res: express.Response) => {
    try {
        const { domainId, action, payload } = req.body;
        ZapierJob.parse({ domainId, action, payload });

        await addZapierJob({ domainId, action, payload });

        res.status(200).json({ message: "Success" });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
