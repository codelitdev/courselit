import ActivityModel, { Activity } from "@models/Activity";

export async function recordActivity(activity: Activity) {
    await ActivityModel.create(activity);
}
