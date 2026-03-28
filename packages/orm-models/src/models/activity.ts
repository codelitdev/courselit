import mongoose from "mongoose";
import { ActivityType, Constants } from "@courselit/common-models";

export interface Activity {
    domain: mongoose.Types.ObjectId;
    userId: string;
    type: ActivityType;
    entityId?: string;
    metadata?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export const ActivitySchema = new mongoose.Schema<Activity>(
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
