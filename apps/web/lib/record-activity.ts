import ActivityModel, { Activity } from "@models/Activity";

export async function recordActivity(activity: Activity) {
    const existingActivity = await ActivityModel.findOne({
        domain: activity.domain,
        userId: activity.userId,
        type: activity.type,
        entityId: activity.entityId,
    });

    if (existingActivity) {
        return;
    }

    await ActivityModel.create(activity);
}
