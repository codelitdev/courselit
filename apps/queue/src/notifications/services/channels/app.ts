import NotificationModel from "../../model/notification";
import { addNotificationJob } from "../enqueue";
import { ChannelPayload, NotificationChannel } from "./types";

export class AppChannel implements NotificationChannel {
    async send(payload: ChannelPayload): Promise<void> {
        const notification = await (NotificationModel as any).create({
            domain: payload.domain._id,
            userId: payload.actorUserId,
            forUserId: payload.recipient.userId,
            activityType: payload.activityType,
            entityId: payload.entityId,
            entityTargetId: payload.entityTargetId,
            metadata: payload.metadata || {},
        });

        await addNotificationJob(notification);
    }
}
