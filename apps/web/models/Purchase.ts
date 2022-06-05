import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import constants from "../config/constants";
const { transactionInitiated, transactionSuccess, transactionFailed } =
    constants;

export interface Purchase {
    domain: mongoose.Types.ObjectId;
    orderId: string;
    courseId: mongoose.Types.ObjectId;
    purchasedOn: Date;
    purchasedBy: mongoose.Types.ObjectId;
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
}

const PurchaseSchema = new mongoose.Schema<Purchase>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: String, required: true, default: generateUniqueId },
    courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
    purchasedOn: { type: Date, required: true, default: () => new Date() },
    purchasedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    paymentMethod: { type: String, required: true },
    paymentId: { type: String },
    amount: { type: Number, required: true },
    currencyISOCode: { type: String, required: true },
    discount: { type: Number },
    status: { type: String, required: true, default: transactionInitiated },
    remark: { type: String },
});

export default mongoose.models.Purchase ||
    mongoose.model("Purchase", PurchaseSchema);
