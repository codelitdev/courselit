import { responses } from "@/config/strings";
import { checkIfAuthenticated } from "@/lib/graphql";
import { getNotificationMessageAndHref } from "@courselit/common-logic";
import {
    ActivityType,
    Constants,
    Notification,
    NotificationChannel,
} from "@courselit/common-models";
import GQLContext from "@models/GQLContext";
import NotificationModel from "@models/Notification";
import NotificationPreferenceModel from "@models/NotificationPreference";
import UserModel from "@models/User";
import mongoose from "mongoose";
import {
    getGeneralDefaultPreferences,
    getAllowedActivityTypesForPermissions,
    isActivityAllowedForPermissions,
} from "./helpers";

interface NotificationDocument {
    notificationId: string;
    userId: string;
    activityType: ActivityType;
    entityId: string;
    entityTargetId?: string;
    metadata?: Record<string, unknown>;
    read: boolean;
    createdAt: Date;
}

export interface NotificationPreferenceItem {
    activityType: ActivityType;
    channels: NotificationChannel[];
}

export async function seedNotificationPreferencesForUser({
    domain,
    userId,
}: {
    domain: mongoose.Types.ObjectId;
    userId: string;
}): Promise<void> {
    const defaults = getGeneralDefaultPreferences();

    if (!defaults.length) {
        return;
    }

    await NotificationPreferenceModel.bulkWrite(
        defaults.map(({ activityType, channels }) => ({
            updateOne: {
                filter: {
                    domain,
                    userId,
                    activityType,
                },
                update: {
                    $setOnInsert: {
                        domain,
                        userId,
                        activityType,
                        channels,
                    },
                },
                upsert: true,
            },
        })),
    );
}

export async function getNotificationPreferences({
    ctx,
}: {
    ctx: GQLContext;
}): Promise<NotificationPreferenceItem[]> {
    checkIfAuthenticated(ctx);

    const allowedActivityTypes = getAllowedActivityTypesForPermissions(
        ctx.user.permissions,
    );

    const preferences = await NotificationPreferenceModel.find(
        {
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            activityType: {
                $in: allowedActivityTypes,
            },
        },
        {
            _id: 0,
            activityType: 1,
            channels: 1,
        },
    )
        .sort({ activityType: 1 })
        .lean<NotificationPreferenceItem[]>();

    const preferencesByActivityType = new Map<
        ActivityType,
        NotificationPreferenceItem
    >(
        preferences.map((preference) => [
            preference.activityType,
            {
                activityType: preference.activityType,
                channels: preference.channels,
            },
        ]),
    );

    return allowedActivityTypes
        .map((activityType) => preferencesByActivityType.get(activityType))
        .filter((preference): preference is NotificationPreferenceItem =>
            Boolean(preference),
        );
}

export async function updateNotificationPreference({
    ctx,
    activityType,
    channels,
}: {
    ctx: GQLContext;
    activityType: ActivityType;
    channels: NotificationChannel[];
}): Promise<NotificationPreferenceItem> {
    checkIfAuthenticated(ctx);

    if (!Object.values(Constants.ActivityType).includes(activityType)) {
        throw new Error(responses.invalid_input);
    }

    if (!isActivityAllowedForPermissions(activityType, ctx.user.permissions)) {
        throw new Error(responses.action_not_allowed);
    }

    const uniqueChannels = Array.from(new Set(channels));
    const validChannels = Object.values(Constants.NotificationChannel);

    if (!uniqueChannels.every((channel) => validChannels.includes(channel))) {
        throw new Error(responses.invalid_input);
    }

    if (!uniqueChannels.length) {
        await NotificationPreferenceModel.deleteOne({
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            activityType,
        });

        return {
            activityType,
            channels: [],
        };
    }

    const preference = await NotificationPreferenceModel.findOneAndUpdate(
        {
            domain: ctx.subdomain._id,
            userId: ctx.user.userId,
            activityType,
        },
        {
            $set: {
                channels: uniqueChannels,
            },
            $setOnInsert: {
                domain: ctx.subdomain._id,
                userId: ctx.user.userId,
                activityType,
            },
        },
        {
            upsert: true,
            new: true,
        },
    );

    if (!preference) {
        throw new Error(responses.internal_error);
    }

    return {
        activityType: preference.activityType,
        channels: preference.channels,
    };
}

export async function getNotification({
    ctx,
    notificationId,
}: {
    ctx: GQLContext;
    notificationId: string;
}): Promise<Notification | null> {
    checkIfAuthenticated(ctx);

    const notification = await NotificationModel.findOne<NotificationDocument>({
        domain: ctx.subdomain._id,
        forUserId: ctx.user.userId,
        notificationId,
    }).lean();

    if (!notification) {
        return null;
    }

    return await formatNotification(
        notification as unknown as NotificationDocument,
        ctx,
    );
}

export async function getNotifications({
    ctx,
    page = 1,
    limit = 10,
}: {
    ctx: GQLContext;
    page?: number;
    limit?: number;
}): Promise<{
    notifications: Notification[];
    total: number;
}> {
    checkIfAuthenticated(ctx);

    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const skip = (safePage - 1) * safeLimit;

    const query = {
        domain: ctx.subdomain._id,
        forUserId: ctx.user.userId,
    };

    const [notifications, total] = await Promise.all([
        NotificationModel.find<NotificationDocument>(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        NotificationModel.countDocuments(query),
    ]);

    if (!notifications.length) {
        return {
            notifications: [],
            total: 0,
        };
    }

    return {
        notifications: await Promise.all(
            notifications.map((notification) =>
                formatNotification(
                    notification as unknown as NotificationDocument,
                    ctx,
                ),
            ),
        ),
        total,
    };
}

async function formatNotification(
    notification: NotificationDocument,
    ctx: GQLContext,
): Promise<Notification> {
    return {
        notificationId: notification.notificationId,
        ...(await getNotificationMessageAndHref({
            activityType: notification.activityType,
            entityId: notification.entityId,
            actorName: await getUserName(notification.userId),
            recipientUserId: ctx.user.userId,
            entityTargetId: notification.entityTargetId,
            metadata: notification.metadata,
            domainId: ctx.subdomain._id,
        })),
        read: notification.read,
        createdAt: notification.createdAt,
    };
}

async function getUserName(userId: string): Promise<string> {
    const user = await UserModel.findOne({ userId });
    return user?.name || user?.email || "Someone";
}

export async function markAsRead({
    ctx,
    notificationId,
}: {
    ctx: GQLContext;
    notificationId: string;
}): Promise<boolean> {
    checkIfAuthenticated(ctx);

    await NotificationModel.updateOne(
        {
            domain: ctx.subdomain._id,
            forUserId: ctx.user.userId,
            notificationId,
        },
        {
            read: true,
        },
    );

    return true;
}

export async function markAllAsRead(ctx: GQLContext): Promise<boolean> {
    checkIfAuthenticated(ctx);

    await NotificationModel.updateMany(
        {
            domain: ctx.subdomain._id,
            forUserId: ctx.user.userId,
            read: false,
        },
        {
            read: true,
        },
    );

    return true;
}
