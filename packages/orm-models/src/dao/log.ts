import mongoose from "mongoose";
import { LogSchema } from "../models/log";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Log || mongoose.model("Log", LogSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/log";
