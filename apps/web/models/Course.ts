import mongoose from "mongoose";
import { CourseSchema } from "@courselit/common-logic";

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
