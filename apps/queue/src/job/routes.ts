import express from "express";
import { addMailJob } from "../domain/handler";
import {
    addDispatchNotificationJob,
    addNotificationJob,
} from "../notifications/services/enqueue";
import { logger } from "../logger";
import { MailJob } from "../domain/model/mail-job";
import NotificationModel from "../notifications/model/notification";
import { ObjectId } from "mongodb";
import { Constants, User } from "@courselit/common-models";
import { z } from "zod";
import { captureError, getDomainId } from "../observability/posthog";

const router: any = express.Router();

router.post(
    "/mail",
    async (
        req: express.Request & { user: User & { domain: string } },
        res: express.Response,
    ) => {
        const domainId = getDomainId(req.user?.domain);

        try {
            const { to, from, subject, body, headers } = req.body;
            MailJob.parse({
                to,
                from,
                subject,
                body,
                headers,
                domainId,
            });

            await addMailJob({ to, from, subject, body, headers, domainId });

            res.status(200).json({ message: "Success" });
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "job.mail.route",
                domainId,
                context: {
                    path: req.path,
                    method: req.method,
                    route: "/job/mail",
                },
            });
            res.status(500).json({ error: err.message });
        }
    },
);

const DispatchNotificationJob = z.object({
    activityType: z
        .string()
        .refine((type) =>
            Object.values(Constants.ActivityType).includes(type as any),
        ),
    entityId: z.string(),
    entityTargetId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

const NotificationJob = z.object({
    forUserIds: z.array(z.string()).min(1),
    activityType: z
        .string()
        .refine((type) =>
            Object.values(Constants.ActivityType).includes(type as any),
        ),
    entityId: z.string(),
    entityTargetId: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

router.post(
    "/dispatch-notification",
    async (
        req: express.Request & { user: User & { domain: string } },
        res: express.Response,
    ) => {
        const { user } = req;

        try {
            const payload = DispatchNotificationJob.parse(req.body);

            await addDispatchNotificationJob({
                domain: new ObjectId(user.domain),
                userId: user.userId,
                activityType: payload.activityType,
                entityId: payload.entityId,
                entityTargetId: payload.entityTargetId,
                metadata: payload.metadata || {},
            });

            res.status(200).json({ message: "Success" });
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "job.dispatch_notification.route",
                domainId: getDomainId(user.domain),
                context: {
                    path: req.path,
                    method: req.method,
                    route: "/job/dispatch-notification",
                },
            });
            res.status(500).json({ error: err.message });
        }
    },
);

router.post(
    "/notification",
    async (
        req: express.Request & { user: User & { domain: string } },
        res: express.Response,
    ) => {
        const { user } = req;

        try {
            const payload = NotificationJob.parse(req.body);

            for (const forUserId of payload.forUserIds) {
                // @ts-ignore - Mongoose type compatibility issue
                const notification = await NotificationModel.create({
                    domain: new ObjectId(user.domain),
                    userId: user.userId,
                    forUserId,
                    activityType: payload.activityType,
                    entityId: payload.entityId,
                    entityTargetId: payload.entityTargetId,
                    metadata: payload.metadata || {},
                });

                await addNotificationJob(notification);
            }

            res.status(200).json({ message: "Success" });
        } catch (err: any) {
            logger.error(err);
            captureError({
                error: err,
                source: "job.notification.route",
                domainId: getDomainId(user.domain),
                context: {
                    path: req.path,
                    method: req.method,
                    route: "/job/notification",
                },
            });
            res.status(500).json({ error: err.message });
        }
    },
);

export default router;
