import mongoose from "mongoose";

export const EmailDeliverySchema = new mongoose.Schema(
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
