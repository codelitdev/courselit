import mongoose from "mongoose";
import { MailRequestStatusSchema } from "../models/mail-request-status";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.MailRequestStatus ||
    mongoose.model("MailRequestStatus", MailRequestStatusSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/mail-request-status";
