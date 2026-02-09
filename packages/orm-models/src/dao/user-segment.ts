import mongoose from "mongoose";
import { UserSegmentSchema } from "../models/user-segment";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.UserSegment ||
    mongoose.model("UserSegment", UserSegmentSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/user-segment";
