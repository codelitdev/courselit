import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import ProgressSchema, { Progress } from "./Progress";
import constants from "../config/constants";
const {
    leadWebsite: website,
    leadNewsletter: newsletter,
    leadDownload: download,
    leadApi: api,
} = constants;

const leads = [website, newsletter, download, api] as const;
type Lead = (typeof leads)[number];

export interface User {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    userId: string;
    email: string;
    active: boolean;
    name?: string;
    purchases: Progress[];
    bio?: string;
    permissions: string[];
    createdAt: Date;
    updatedAt: Date;
    subscribedToUpdates: boolean;
    lead: Lead;
    tags?: string[];
}

const UserSchema = new mongoose.Schema<User>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true, default: generateUniqueId },
        email: { type: String, required: true },
        active: { type: Boolean, required: true, default: true },
        name: { type: String, required: false },
        purchases: [ProgressSchema],
        bio: { type: String },
        permissions: [String],
        subscribedToUpdates: { type: Boolean, default: true },
        lead: {
            type: String,
            required: true,
            enum: [website, newsletter, download, api],
            default: website,
        },
        tags: [String],
    },
    {
        timestamps: true,
    },
);

UserSchema.index({
    email: "text",
    name: "text",
});

UserSchema.index(
    {
        domain: 1,
        email: 1,
    },
    { unique: true },
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
