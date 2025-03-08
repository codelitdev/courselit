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
        oneTimeAmount: { type: Number },
        emiAmount: { type: Number },
        emiTotalInstallments: { type: Number },
        subscriptionMonthlyAmount: { type: Number },
        subscriptionYearlyAmount: { type: Number },
        userId: { type: String, required: true },
        archived: { type: Boolean, default: false },
        internal: { type: Boolean, default: false },
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

export default mongoose.models.PaymentPlan ||
    mongoose.model("PaymentPlan", PaymentPlanSchema);
