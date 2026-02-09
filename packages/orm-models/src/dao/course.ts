import mongoose from "mongoose";
import { CourseSchema } from "../models/course";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Course || mongoose.model("Course", CourseSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/course";
