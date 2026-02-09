import mongoose from "mongoose";
import { EmailDeliverySchema } from "../models/email-delivery";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.EmailDelivery ||
    mongoose.model("EmailDelivery", EmailDeliverySchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/email-delivery";
