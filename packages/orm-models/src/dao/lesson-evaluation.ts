import mongoose from "mongoose";
import { LessonEvaluationSchema } from "../models/lesson-evaluation";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.LessonEvaluation ||
    mongoose.model("LessonEvaluation", LessonEvaluationSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/lesson-evaluation";
