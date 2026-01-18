import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalCommunityPostSubscriber {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    subscriptionId: string;
    postId: string;
    userId: string;
    subscription: boolean;
}

export const CommunityPostSubscriberSchema =
    new mongoose.Schema<InternalCommunityPostSubscriber>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            subscriptionId: {
                type: String,
                required: true,
                unique: true,
                default: generateUniqueId,
            },
            postId: { type: String, required: true },
            userId: { type: String, required: true },
            subscription: { type: Boolean, default: true },
        },
        {
            timestamps: true,
        },
    );

CommunityPostSubscriberSchema.index({ postId: 1, userId: 1 }, { unique: true });

const CommunityPostSubscriberModel =
    mongoose.models.CommunityPostSubscriber ||
    mongoose.model<InternalCommunityPostSubscriber>(
        "CommunityPostSubscriber",
        CommunityPostSubscriberSchema,
    );

export default CommunityPostSubscriberModel;
