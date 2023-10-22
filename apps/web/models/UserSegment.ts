import mongoose from "mongoose";
import UserFilterSchema, { UserFilter } from "./UserFilter";
import { generateUniqueId } from "@courselit/utils";

export interface UserSegment {
    domain: mongoose.Types.ObjectId;
    userId: string;
    segmentId: string;
    name: string;
    filters: UserFilter[];
    dbFilters: Record<string, unknown>
}

const UserSegmentSchema = new mongoose.Schema<UserSegment>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    segmentId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    filters: [UserFilterSchema],
    dbFilters: mongoose.Schema.Types.Mixed 
});

export default mongoose.models.UserSegment ||
    mongoose.model("UserSegment", UserSegmentSchema);
