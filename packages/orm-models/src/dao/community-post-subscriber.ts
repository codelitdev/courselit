import mongoose from "mongoose";
import { CommunityPostSubscriberSchema } from "../models/community-post-subscriber";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.CommunityPostSubscriber ||
    mongoose.model("CommunityPostSubscriber", CommunityPostSubscriberSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/community-post-subscriber";
