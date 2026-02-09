import mongoose from "mongoose";
import { NotificationSchema } from "../models/notification";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Notification ||
    mongoose.model("Notification", NotificationSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/notification";
