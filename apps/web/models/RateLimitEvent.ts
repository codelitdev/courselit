import mongoose, { Model } from "mongoose";
import {
    InternalRateLimitEvent,
    RateLimitEventSchema,
} from "@courselit/orm-models";

const RateLimitEventModel =
    (mongoose.models.RateLimitEvent as
        | Model<InternalRateLimitEvent>
        | undefined) ||
    mongoose.model<InternalRateLimitEvent>(
        "RateLimitEvent",
        RateLimitEventSchema,
    );

export type { InternalRateLimitEvent };
export default RateLimitEventModel;
