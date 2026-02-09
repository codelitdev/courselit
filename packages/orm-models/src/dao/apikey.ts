import mongoose from "mongoose";
import { ApiKeySchema } from "../models/apikey";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Apikey || mongoose.model("Apikey", ApiKeySchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/apikey";
