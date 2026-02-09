import mongoose from "mongoose";
import {
    CertificateTemplateSchema,
    type InternalCertificateTemplate,
} from "../models/certificate-template";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.CertificateTemplate ||
    mongoose.model("CertificateTemplate", CertificateTemplateSchema);

const dao = createMongooseDao(model);

export default dao;
export type CertificateTemplate = InternalCertificateTemplate;
export * from "../models/certificate-template";
