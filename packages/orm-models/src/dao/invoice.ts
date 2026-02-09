import mongoose from "mongoose";
import { InvoiceSchema } from "../models/invoice";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/invoice";
