import mongoose from "mongoose";
import { UserSegmentSchema } from "@courselit/common-logic";
export default mongoose.models.UserSegment ||
    mongoose.model("UserSegment", UserSegmentSchema);
