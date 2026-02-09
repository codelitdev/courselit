import mongoose from "mongoose";
import { RuleSchema } from "../models/rule";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Rule || mongoose.model("Rule", RuleSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/rule";
