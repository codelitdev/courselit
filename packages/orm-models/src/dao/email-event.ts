import mongoose from "mongoose";
import { EmailEventSchema } from "../models/email-event";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.EmailEvent ||
    mongoose.model("EmailEvent", EmailEventSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/email-event";
