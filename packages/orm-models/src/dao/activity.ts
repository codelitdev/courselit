import mongoose from "mongoose";
import { ActivitySchema } from "../models/activity";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/activity";
