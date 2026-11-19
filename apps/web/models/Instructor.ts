import { InternalInstructor, InstructorSchema } from "@courselit/orm-models";
import mongoose, { Model } from "mongoose";

const InstructorModel =
    (mongoose.models.Instructor as Model<InternalInstructor> | undefined) ||
    mongoose.model<InternalInstructor>("Instructor", InstructorSchema);

export type { InternalInstructor };
export default InstructorModel;
