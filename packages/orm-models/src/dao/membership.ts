import mongoose from "mongoose";
import { MembershipSchema } from "../models/membership";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Membership ||
    mongoose.model("Membership", MembershipSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/membership";
