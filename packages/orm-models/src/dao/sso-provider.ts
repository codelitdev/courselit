import mongoose from "mongoose";
import { SSOProviderSchema } from "../models/sso-provider";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.SSOProvider ||
    mongoose.model("SSOProvider", SSOProviderSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/sso-provider";
