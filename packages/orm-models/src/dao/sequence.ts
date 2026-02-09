import mongoose from "mongoose";
import { SequenceSchema } from "../models/sequence";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Sequence || mongoose.model("Sequence", SequenceSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/sequence";
