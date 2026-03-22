import mongoose from "mongoose";
import { CourseSchema } from "@courselit/orm-models";

export default mongoose.models.Course || mongoose.model("Course", CourseSchema);
