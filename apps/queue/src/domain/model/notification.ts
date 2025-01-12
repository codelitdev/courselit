import {
    Constants,
    Notification,
    NotificationEntityAction,
} from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalNotification
    extends Omit<Notification, "message" | "href">,
        mongoose.Document {
    domain: mongoose.Types.ObjectId;
    notificationId: string;
    userId: string;
    entityAction: NotificationEntityAction;
    entityId: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
    entityTargetId?: string;
}

const NotificationSchema = new mongoose.Schema(
    {
        domain: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        },
        notificationId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        userId: {
            type: String,
            required: true,
            ref: "User",
        },
        forUserId: {
            type: String,
            required: true,
            ref: "User",
        },
        entityAction: {
            type: String,
            required: true,
            enum: Object.values(Constants.NotificationEntityAction),
        },
        entityId: {
            type: String,
            required: true,
        },
        read: {
            type: Boolean,
            required: true,
            default: false,
        },
        entityTargetId: {
            type: String,
        },
    },
    {
        timestamps: true,
    },
);

NotificationSchema.statics.paginate = async function (userId, options) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const query = {
        forUserId: userId,
    };

    const notifications = await this.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const total = await this.countDocuments(query);

    return { notifications, total };
};

export default mongoose.models.Notification ||
    mongoose.model("Notification", NotificationSchema);
