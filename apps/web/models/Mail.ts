import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface Mail {
    domain: mongoose.Types.ObjectId;
    mailId: string;
    creatorId: string;
    to?: string[];
    subject?: string;
    body?: string;
    published: boolean;
}

const MailSchema = new mongoose.Schema<Mail>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        mailId: { type: String, required: true, default: generateUniqueId },
        creatorId: { type: String, required: true },
        published: { type: Boolean, required: true, default: false },
        to: [String],
        subject: String,
        body: String,
    },
    {
        timestamps: true,
    },
);

export default mongoose.models.Mail || mongoose.model("Mail", MailSchema);
