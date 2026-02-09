import mongoose from "mongoose";
import { PageSchema, type InternalPage } from "../models/page";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model = mongoose.models.Page || mongoose.model("Page", PageSchema);

const dao = createMongooseDao(model);

export default dao;
export type Page = InternalPage;
export * from "../models/page";
