import { Constants, PaymentPlan } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalPaymentPlan extends PaymentPlan {
    domain: mongoose.Types.ObjectId;
    userId: string;
    archived: boolean;
    internal: boolean;
}

const PaymentPlanSchema = new mongoose.Schema<InternalPaymentPlan>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        planId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        name: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: Object.values(Constants.PaymentPlanType),
        },
        entityId: { type: String, required: true },
        entityType: {
            type: String,
            required: true,
            enum: Object.values(Constants.MembershipEntityType),
        },
        userId: { type: String, required: true },
        oneTimeAmount: { type: Number },
        emiAmount: { type: Number },
        emiTotalInstallments: { type: Number },
        subscriptionMonthlyAmount: { type: Number },
        subscriptionYearlyAmount: { type: Number },
        archived: { type: Boolean, default: false },
        internal: { type: Boolean, default: false },
        description: { type: String },
        includedProducts: { type: [String], default: [] },
    },
    {
        timestamps: true,
    },
);

PaymentPlanSchema.pre("save", async function (next) {
    if (this.internal) {
        const existingInternalPlan = await this.constructor.findOne({
            domain: this.domain,
            internal: true,
            _id: { $ne: this._id },
        });

        if (existingInternalPlan) {
            const error = new Error(
                "Only one internal payment plan allowed per domain",
            );
            return next(error);
        }

        if (this.type !== Constants.PaymentPlanType.FREE) {
            const error = new Error("Internal payment plans must be free");
            return next(error);
        }
    }
    next();
});

// Add indexes for common query patterns
PaymentPlanSchema.index({ domain: 1, entityId: 1, entityType: 1, archived: 1 });
PaymentPlanSchema.index({ domain: 1, internal: 1 });
PaymentPlanSchema.index({ domain: 1, planId: 1, archived: 1 });
PaymentPlanSchema.index({ domain: 1, archived: 1, type: 1 });

export default mongoose.models.PaymentPlan ||
    mongoose.model("PaymentPlan", PaymentPlanSchema);
