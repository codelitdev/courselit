import mongoose from "mongoose";
import { CommunityReportSchema } from "../models/community-report";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.CommunityReport ||
    mongoose.model("CommunityReport", CommunityReportSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/community-report";
