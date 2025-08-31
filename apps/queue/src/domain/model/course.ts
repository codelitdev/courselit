import mongoose from "mongoose";
import { CourseSchema } from "@courselit/common-logic";

export default mongoose.models.Domain || mongoose.model("Course", CourseSchema);
