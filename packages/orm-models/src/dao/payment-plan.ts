import mongoose from "mongoose";
import { PaymentPlanSchema } from "../models/payment-plan";
import { createMongooseDao } from "../daos/create-mongoose-dao";

const model =
    mongoose.models.PaymentPlan ||
    mongoose.model("PaymentPlan", PaymentPlanSchema);

const dao = createMongooseDao(model);

export default dao;
export * from "../models/payment-plan";
