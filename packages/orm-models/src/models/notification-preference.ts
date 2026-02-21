import {
    ActivityType,
    Constants,
    NotificationChannel,
    NotificationPreference,
} from "@courselit/common-models";
import mongoose from "mongoose";

export interface InternalNotificationPreference
    extends Omit<NotificationPreference, "updatedAt">,
        mongoose.Document {
    domain: mongoose.Types.ObjectId;
    userId: string;
    activityType: ActivityType;
    channels: NotificationChannel[];
    createdAt: Date;
    updatedAt: Date;
}

export const NotificationPreferenceSchema = new mongoose.Schema(
    {
        domain: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        userId: {
            type: String,
            required: true,
            ref: "User",
        },
        activityType: {
            type: String,
            required: true,
            enum: Object.values(Constants.ActivityType),
        },
        channels: {
            type: [String],
            required: true,
            default: [],
            enum: Object.values(Constants.NotificationChannel),
        },
    },
    {
        timestamps: true,
    },
);

NotificationPreferenceSchema.index(
    {
        domain: 1,
        userId: 1,
        activityType: 1,
    },
    {
        unique: true,
    },
);

NotificationPreferenceSchema.index({
    domain: 1,
    activityType: 1,
});
