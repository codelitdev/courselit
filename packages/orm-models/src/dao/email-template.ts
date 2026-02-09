import mongoose from "mongoose";
import { EmailTemplateSchema } from "../models/email-template";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.EmailTemplate ||
    mongoose.model("EmailTemplate", EmailTemplateSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/email-template";
