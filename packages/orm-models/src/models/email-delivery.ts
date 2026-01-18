import mongoose from "mongoose";

export interface InternalEmailDelivery {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    sequenceId: string;
    userId: string;
    emailId: string;
    createdAt: Date;
}

export const EmailDeliverySchema = new mongoose.Schema<InternalEmailDelivery>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        sequenceId: { type: String, required: true },
        userId: { type: String, required: true },
        emailId: { type: String, required: true },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    },
);

const EmailDeliveryModel =
    mongoose.models.EmailDelivery ||
    mongoose.model<InternalEmailDelivery>("EmailDelivery", EmailDeliverySchema);

export default EmailDeliveryModel;
