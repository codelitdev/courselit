import mongoose from "mongoose";
import { LessonSchema, type InternalLesson } from "../models/lesson";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Lesson || mongoose.model("Lesson", LessonSchema);

const dao = createMongooseDao(model);

export default dao;
export type Lesson = InternalLesson;
export * from "../models/lesson";
