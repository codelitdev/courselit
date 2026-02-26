import { ActivityType, User } from "@courselit/common-models";

export interface ChannelPayload {
    domain: any;
    actorUserId: string;
    actor: Partial<User> | null;
    recipient: any;
    activityType: ActivityType;
    entityId: string;
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
    send(payload: ChannelPayload): Promise<void>;
}
