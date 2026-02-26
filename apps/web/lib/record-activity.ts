import ActivityModel, { Activity } from "@models/Activity";
import { error } from "../services/logger";
import { addNotificationDispatchJob } from "@/services/queue";
import { Constants } from "@courselit/common-models";

const MULTIPLE_ENTRIES_ALLOWED = [
    Constants.ActivityType.NEWSLETTER_SUBSCRIBED,
    Constants.ActivityType.NEWSLETTER_UNSUBSCRIBED,
    Constants.ActivityType.COMMUNITY_MEMBERSHIP_REQUESTED,
    Constants.ActivityType.COMMUNITY_MEMBERSHIP_GRANTED,
    Constants.ActivityType.COMMUNITY_JOINED,
    Constants.ActivityType.COMMUNITY_LEFT,
];

export async function recordActivity(activity: Activity) {
    try {
        let existingActivity = null;
        if (!MULTIPLE_ENTRIES_ALLOWED.includes(activity.type as any)) {
            existingActivity = await ActivityModel.findOne({
                domain: activity.domain,
                userId: activity.userId,
                type: activity.type,
                entityId: activity.entityId,
                metadata: activity.metadata,
            });
        }

        if (existingActivity) {
            return;
        }

        const createdActivity = await ActivityModel.create(activity);

        await addNotificationDispatchJob({
            domain: activity.domain.toString(),
            entityId: activity.entityId || activity.userId,
            activityType: activity.type,
            userId: activity.userId,
            entityTargetId:
                (activity.metadata?.entityTargetId as string) || undefined,
            metadata: {
                ...activity.metadata,
                activityId: createdActivity._id.toString(),
            },
        });
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
    }
}
