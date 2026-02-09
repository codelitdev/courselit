import mongoose from "mongoose";
import { UserSchema } from "../models/user";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.User || mongoose.model("User", UserSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/user";
