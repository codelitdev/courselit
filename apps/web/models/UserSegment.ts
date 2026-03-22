import mongoose from "mongoose";
import { UserSegmentSchema } from "@courselit/orm-models";
export default mongoose.models.UserSegment ||
    mongoose.model("UserSegment", UserSegmentSchema);
