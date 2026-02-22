import {
    InternalNotification,
    NotificationSchema,
} from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const NotificationModel =
    (mongoose.models.Notification as Model<InternalNotification> | undefined) ||
    mongoose.model<InternalNotification>("Notification", NotificationSchema);

export default NotificationModel;
