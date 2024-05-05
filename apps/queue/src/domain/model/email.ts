import mongoose from "mongoose";
import { Email, Constants } from "@courselit/common-models";

const EmailSchema = new mongoose.Schema<Email>({
    emailId: { type: String, required: true },
    templateId: { type: String },
    content: { type: String, required: true },
    subject: { type: String, required: true },
    delayInMillis: { type: Number, required: true, default: 86400000 },
    published: { type: Boolean, required: true, default: false },
    action: new mongoose.Schema({
        type: {
            type: String,
            enum: Constants.emailActionTypes,
        },
        data: { type: mongoose.Schema.Types.Mixed },
    }),
});

export default EmailSchema;
