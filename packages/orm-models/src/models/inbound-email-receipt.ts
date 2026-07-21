import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import type {
    InboundEmailProvider,
    InboundEmailReceiptStatus,
} from "@courselit/common-models";

export const INBOUND_EMAIL_RECEIPT_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface InternalInboundEmailReceipt extends mongoose.Document {
    domain: mongoose.Types.ObjectId;
    userId: string;
    provider: InboundEmailProvider;
    messageId: string;
    status: InboundEmailReceiptStatus;
    processingId?: string;
    processingExpiresAt?: Date;
    expiresAt: Date;
    createdAt: Date;
}

/**
 * Records a provider message after it has been accepted.  Providers retry
 * webhook delivery, so this is deliberately separate from reply tokens and
 * keyed by the provider's immutable message id.
 */
export const InboundEmailReceiptSchema =
    new mongoose.Schema<InternalInboundEmailReceipt>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            userId: { type: String, required: true },
            provider: {
                type: String,
                required: true,
                enum: Object.values(Constants.InboundEmailProvider),
            },
            messageId: { type: String, required: true },
            status: {
                type: String,
                required: true,
                enum: Object.values(Constants.InboundEmailReceiptStatus),
            },
            processingId: String,
            processingExpiresAt: Date,
            expiresAt: { type: Date, required: true },
        },
        {
            timestamps: { createdAt: true, updatedAt: false },
        },
    );

InboundEmailReceiptSchema.index(
    { provider: 1, messageId: 1 },
    { unique: true },
);
InboundEmailReceiptSchema.index({ domain: 1, userId: 1 });
InboundEmailReceiptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
