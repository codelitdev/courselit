import { MongooseRepository } from "./base.repository";
import { PaymentPlanRepository } from "../../contracts/payment-plan.repository";
import { PaymentPlan } from "@courselit/common-models";
import { InternalPaymentPlan } from "../../models/payment-plan";
import mongoose, { Model } from "mongoose";

export class MongoosePaymentPlanRepository
    extends MongooseRepository<PaymentPlan, InternalPaymentPlan>
    implements PaymentPlanRepository
{
    constructor(model: Model<InternalPaymentPlan>) {
        super(model);
    }

    protected toEntity(doc: InternalPaymentPlan): PaymentPlan {
        return {
            ...doc,
            id: doc._id.toString(),
            domain: doc.domain.toString(),
        } as unknown as PaymentPlan;
    }

    async findByPlanId(
        planId: string,
        domainId: string,
    ): Promise<PaymentPlan | null> {
        const doc = await this.model
            .findOne({ planId, domain: domainId })
            .lean();
        return doc ? this.toEntity(doc as InternalPaymentPlan) : null;
    }

    async removeProductFromPlans(
        productId: string,
        domainId: string,
    ): Promise<void> {
        await this.model
            .updateMany(
                { domain: domainId, includedProducts: { $in: [productId] } },
                { $pull: { includedProducts: productId } as any },
            )
            .exec();
    }
}
