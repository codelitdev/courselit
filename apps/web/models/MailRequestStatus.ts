import { Constants } from "@courselit/common-models";
import mongoose, { Schema } from "mongoose";

export interface MailRequestStatus {
    domain: mongoose.Types.ObjectId;
    userId: string;
    reason: string;
    status: (typeof Constants.mailRequestStatus)[number];
    message?: string;
}

const MailRequestStatusSchema: Schema = new Schema<MailRequestStatus>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        userId: { type: String, required: true },
        reason: { type: String, required: true },
        message: { type: String },
        status: {
            type: String,
            required: true,
            enum: Constants.mailRequestStatus,
            default: Constants.mailRequestStatus[0],
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.MailRequestStatus ||
    mongoose.model("MailRequestStatus", MailRequestStatusSchema);
