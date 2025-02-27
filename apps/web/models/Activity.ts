import mongoose from "mongoose";
import constants from "@config/constants";
import { ActivityType, Constants } from "@courselit/common-models";
const { activityTypes } = constants;

export interface Activity {
    domain: mongoose.Types.ObjectId;
    userId: string;
    type: ActivityType;
    entityId?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

const ActivitySchema = new mongoose.Schema<Activity>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: Object.values(Constants.ActivityType),
        },
        entityId: { type: String },
        metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: true,
    },
);

ActivitySchema.index({ domain: 1, type: 1, createdAt: 1 });

export default mongoose.models.Activity ||
    mongoose.model("Activity", ActivitySchema);
