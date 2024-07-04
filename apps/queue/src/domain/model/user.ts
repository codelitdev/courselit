import { User } from "@courselit/common-models";
import mongoose from "mongoose";
import ProgressSchema from "./progress";

export type UserWithDomain = User & {
    domain: mongoose.Schema.Types.ObjectId;
    unsubscribeToken: string;
};

const UserSchema = new mongoose.Schema<UserWithDomain>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        email: { type: String, required: true },
        active: { type: Boolean, required: true, default: true },
        name: { type: String, required: false },
        purchases: [ProgressSchema],
        bio: { type: String },
        permissions: [String],
        subscribedToUpdates: { type: Boolean, default: true },
        tags: [String],
        unsubscribeToken: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
