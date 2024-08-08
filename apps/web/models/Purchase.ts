import { generateUniqueId } from "@courselit/utils";
import mongoose, { Schema } from "mongoose";
import constants from "../config/constants";
const { transactionInitiated, transactionSuccess, transactionFailed } =
    constants;

export interface Purchase {
    domain: mongoose.Types.ObjectId;
    orderId: string;
    courseId: string;
    purchasedOn: Date;
    purchasedBy: string;
    paymentMethod: string;
    amount: number;
    status:
        | typeof transactionInitiated
        | typeof transactionSuccess
        | typeof transactionFailed;
    currencyISOCode: string;
    paymentId?: string;
    discount?: string;
    remark?: number;
    webhookPayload?: Record<string, unknown>;
}

const PurchaseSchema = new mongoose.Schema<Purchase>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: String, required: true, default: generateUniqueId },
    courseId: { type: String, required: true },
    purchasedOn: { type: Date, required: true, default: () => new Date() },
    purchasedBy: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentId: { type: String },
    amount: { type: Number, required: true },
    currencyISOCode: { type: String, required: true },
    discount: { type: Number },
    status: { type: String, required: true, default: transactionInitiated },
    remark: { type: String },
    webhookPayload: { type: Schema.Types.Mixed },
});

export default mongoose.models.Purchase ||
    mongoose.model("Purchase", PurchaseSchema);
