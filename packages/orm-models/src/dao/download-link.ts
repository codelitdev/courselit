import mongoose from "mongoose";
import { DownloadLinkSchema } from "../models/download-link";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.DownloadLink ||
    mongoose.model("DownloadLink", DownloadLinkSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/download-link";
