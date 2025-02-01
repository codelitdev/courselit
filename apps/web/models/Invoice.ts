import { Constants, Invoice } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalInvoice extends Invoice {
    domain: mongoose.Types.ObjectId;
}

const InvoiceSchema = new mongoose.Schema<InternalInvoice>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        invoiceId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        membershipId: { type: String, required: true },
        membershipSessionId: { type: String, required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: Object.values(Constants.InvoiceStatus),
            default: Constants.InvoiceStatus.PENDING,
        },
        paymentProcessor: { type: String, required: true },
        paymentProcessorEntityId: { type: String },
        paymentProcessorTransactionId: { type: String },
        currencyISOCode: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Invoice ||
    mongoose.model("Invoice", InvoiceSchema);
