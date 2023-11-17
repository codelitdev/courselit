import mongoose from "mongoose";
import { Email } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";

const EmailSchema = new mongoose.Schema<Email>({
    emailId: { type: String, required: true, default: generateUniqueId },
    templateId: { type: String, required: true },
    content: { type: String, required: true },
    subject: { type: String, required: true },
    delayInMillis: { type: Number, required: true, default: 86400000 },
    published: { type: Boolean, required: true, default: false },
});

export default EmailSchema;
