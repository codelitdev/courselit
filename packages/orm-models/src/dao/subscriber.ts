import mongoose from "mongoose";
import { SubscriberSchema } from "../models/subscriber";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Subscriber ||
    mongoose.model("Subscriber", SubscriberSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/subscriber";
