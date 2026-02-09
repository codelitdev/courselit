import mongoose from "mongoose";
import { DomainSchema } from "../models/domain";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Domain || mongoose.model("Domain", DomainSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/domain";
