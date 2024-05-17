import ActivityModel, { Activity } from "@models/Activity";
import { error } from "../services/logger";

export async function recordActivity(activity: Activity) {
    try {
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
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
    }
}
