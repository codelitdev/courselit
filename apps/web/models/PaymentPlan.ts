import { Constants, PaymentPlan } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalPaymentPlan extends PaymentPlan {
    domain: mongoose.Types.ObjectId;
    userId: string;
    archived: boolean;
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
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.PaymentPlan ||
    mongoose.model("PaymentPlan", PaymentPlanSchema);
