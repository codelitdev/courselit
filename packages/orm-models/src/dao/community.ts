import mongoose from "mongoose";
import { CommunitySchema } from "../models/community";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Community || mongoose.model("Community", CommunitySchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/community";
