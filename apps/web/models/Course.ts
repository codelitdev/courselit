import { InternalCourse, CourseSchema } from "@courselit/common-logic";
import mongoose, { Model } from "mongoose";

const CourseModel =
    (mongoose.models.Course as Model<InternalCourse> | undefined) ||
    mongoose.model<InternalCourse>("Course", CourseSchema);

export type { InternalCourse };
export default CourseModel;
