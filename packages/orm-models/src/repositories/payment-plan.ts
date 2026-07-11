import mongoose, { type Model } from "mongoose";
import { BaseRepository } from "./base";
import {
    PaymentPlanSchema,
    type InternalPaymentPlan,
} from "../models/payment-plan";

export class PaymentPlanRepository extends BaseRepository<InternalPaymentPlan> {
    constructor(model?: Model<InternalPaymentPlan>) {
        super(
            model ??
                ((mongoose.models.PaymentPlan ||
                    mongoose.model(
                        "PaymentPlan",
                        PaymentPlanSchema,
                    )) as Model<InternalPaymentPlan>),
        );
    }

    async findByPlanId(
        domain: mongoose.Types.ObjectId,
        planId: string,
    ): Promise<InternalPaymentPlan | null> {
        return this.findOne({ domain, planId });
    }

    async findByEntity(
        domain: mongoose.Types.ObjectId,
        entityId: string,
    ): Promise<InternalPaymentPlan[]> {
        return this.find({ domain, entityId, archived: false });
    }
}
