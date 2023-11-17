import mongoose from "mongoose";
import { UserFilterWithAggregatorSchema } from "./UserFilter";
import { generateUniqueId } from "@courselit/utils";
import { UserFilterWithAggregator } from "@courselit/common-models";

export interface UserSegment {
    domain: mongoose.Types.ObjectId;
    userId: string;
    segmentId: string;
    name: string;
    filter: UserFilterWithAggregator;
}

const UserSegmentSchema = new mongoose.Schema<UserSegment>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
    segmentId: { type: String, required: true, default: generateUniqueId },
    name: { type: String, required: true },
    filter: UserFilterWithAggregatorSchema,
});

export default mongoose.models.UserSegment ||
    mongoose.model("UserSegment", UserSegmentSchema);
