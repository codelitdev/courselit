import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";

export const EmailEventSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        sequenceId: { type: String, required: true },
        userId: { type: String, required: true },
        emailId: { type: String, required: true },
        action: {
            type: String,
            required: true,
            enum: Object.values(Constants.EmailEventAction),
        },
        link: { type: String },
        linkIndex: { type: Number },
        bounceType: { type: String, enum: ["hard", "soft"] },
        bounceReason: { type: String },
    },
    {
        timestamps: true,
    },
);
