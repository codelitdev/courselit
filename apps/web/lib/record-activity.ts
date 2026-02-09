import ActivityModel, { Activity } from "@courselit/orm-models/dao/activity";
import { error } from "../services/logger";

export async function recordActivity(activity: Activity) {
    try {
        const existingActivity = await ActivityModel.queryOne({
            domain: activity.domain,
            userId: activity.userId,
            type: activity.type,
            entityId: activity.entityId,
        });

        if (existingActivity) {
            return;
        }

        await ActivityModel.createOne(activity);
    } catch (err: any) {
        error(err.message, {
            stack: err.stack,
        });
    }
}
