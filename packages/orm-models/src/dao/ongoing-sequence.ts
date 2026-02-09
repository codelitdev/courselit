import mongoose from "mongoose";
import { OngoingSequenceSchema } from "../models/ongoing-sequence";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.OngoingSequence ||
    mongoose.model("OngoingSequence", OngoingSequenceSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/ongoing-sequence";
