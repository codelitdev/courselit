import {
    InternalNotificationPreference,
    NotificationPreferenceSchema,
} from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const NotificationPreferenceModel =
    (mongoose.models.NotificationPreference as
        | Model<InternalNotificationPreference>
        | undefined) ||
    mongoose.model<InternalNotificationPreference>(
        "NotificationPreference",
        NotificationPreferenceSchema,
    );

export default NotificationPreferenceModel;
