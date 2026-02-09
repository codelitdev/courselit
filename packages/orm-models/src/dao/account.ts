import mongoose from "mongoose";
import { AccountSchema } from "../models/account";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Account || mongoose.model("Account", AccountSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/account";
