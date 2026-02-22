import { Worker } from "bullmq";
import {
    ActivityType,
    Constants,
    NotificationChannel as NotificationChannelType,
} from "@courselit/common-models";
import redis from "../../redis";
import { logger } from "../../logger";
import UserModel from "../../domain/model/user";
import DomainModel from "../../domain/model/domain";
import mongoose from "mongoose";
import { checkPermission } from "@courselit/utils";
import NotificationPreferenceModel from "../model/notification-preference";
import { AppChannel } from "../services/channels/app";
import { EmailChannel } from "../services/channels/email";
import {
    ChannelPayload,
    NotificationChannel,
} from "../services/channels/types";

interface DispatchNotificationJob {
    domain: string | mongoose.Types.ObjectId;
    userId: string;
    activityType: ActivityType;
    entityId: string;
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
}

const channelRegistry: Record<string, NotificationChannel> = {
    [Constants.NotificationChannel.APP]: new AppChannel(),
    [Constants.NotificationChannel.EMAIL]: new EmailChannel(),
};

const worker = new Worker(
    "dispatch-notification",
    async (job) => {
        try {
            await processDispatchNotificationJob(
                job.data as DispatchNotificationJob,
            );
        } catch (err: any) {
            logger.error(err);
            throw err;
        }
    },
    { connection: redis },
);

export default worker;

async function processDispatchNotificationJob(job: DispatchNotificationJob) {
    if (!Object.values(Constants.ActivityType).includes(job.activityType)) {
        return;
    }

    const domainId =
        typeof job.domain === "string"
            ? new mongoose.Types.ObjectId(job.domain)
            : job.domain;

    const [domain, actor] = await Promise.all([
        (DomainModel as any).findById(domainId).lean(),
        (UserModel as any)
            .findOne({ domain: domainId, userId: job.userId })
            .lean(),
    ]);

    if (!domain) {
        return;
    }

    const hasTargetUserIds = Array.isArray(job.metadata?.forUserIds);
    const targetUserIds = new Set(
        hasTargetUserIds ? (job.metadata?.forUserIds as string[]) : [],
    );

    if (hasTargetUserIds && !targetUserIds.size) {
        return;
    }

    const query: Record<string, unknown> = {
        domain: domainId,
        activityType: job.activityType,
        channels: { $ne: [] },
    };

    if (hasTargetUserIds) {
        query.userId = {
            $in: Array.from(targetUserIds),
        };
    }

    const cursor = (NotificationPreferenceModel as any).find(query).cursor();
    const recipientCache = new Map<string, any>();

    for await (const preference of cursor as any) {
        if (preference.userId === job.userId) {
            continue;
        }

        if (!preference.channels?.length) {
            continue;
        }

        if (hasTargetUserIds && !targetUserIds.has(preference.userId)) {
            continue;
        }

        let recipient = recipientCache.get(preference.userId);
        if (!recipient) {
            recipient = await (UserModel as any)
                .findOne({
                    domain: domainId,
                    userId: preference.userId,
                })
                .lean();
            if (recipient) {
                recipientCache.set(preference.userId, recipient);
            }
        }

        if (!recipient) {
            continue;
        }

        const requiredPermission =
            Constants.ActivityPermissionMap[job.activityType];
        const isGeneralActivity = requiredPermission === "";
        if (
            requiredPermission &&
            !isGeneralActivity &&
            !checkPermission(recipient.permissions || [], [requiredPermission])
        ) {
            continue;
        }

        const payload: ChannelPayload = {
            domain,
            actorUserId: job.userId,
            actor,
            recipient,
            activityType: job.activityType,
            entityId: job.entityId,
            entityTargetId:
                job.entityTargetId ||
                (job.metadata?.entityTargetId as string) ||
                undefined,
            metadata: job.metadata || {},
        };

        await Promise.allSettled(
            Array.from(new Set(preference.channels)).map((channel) => {
                const handler =
                    channelRegistry[channel as NotificationChannelType];
                if (!handler) {
                    return Promise.resolve();
                }

                return handler.send(payload);
            }),
        );
    }
}
