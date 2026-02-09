import mongoose from "mongoose";
import { CommunityCommentSchema } from "../models/community-comment";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.CommunityComment ||
    mongoose.model("CommunityComment", CommunityCommentSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/community-comment";
