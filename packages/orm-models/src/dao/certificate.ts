import mongoose from "mongoose";
import { CertificateSchema } from "../models/certificate";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Certificate ||
    mongoose.model("Certificate", CertificateSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/certificate";
