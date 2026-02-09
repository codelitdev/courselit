import mongoose from "mongoose";
import { CommunityPostSchema } from "../models/community-post";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.CommunityPost ||
    mongoose.model("CommunityPost", CommunityPostSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/community-post";
