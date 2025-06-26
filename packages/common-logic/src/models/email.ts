import mongoose from "mongoose";
import { Email, Constants } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import { EmailBlock, EmailMeta, EmailStyle } from "@courselit/email-editor";

const EmailContentBlockSchema = new mongoose.Schema<EmailBlock>(
    {
        blockType: { type: String, required: true },
        settings: { type: Object, required: true, default: () => ({}) },
    },
    { _id: false },
);

const EmailStyleSchema = new mongoose.Schema<EmailStyle>(
    {
        colors: { type: Object, required: true },
        typography: { type: Object, required: true },
        structure: { type: Object, required: true },
    },
    { _id: false },
);

const EmailMetaSchema = new mongoose.Schema<EmailMeta>(
    {
        previewText: { type: String },
        utm: { type: Object },
    },
    { _id: false },
);

const EmailActionSchema = new mongoose.Schema(
    {
        type: { type: String, enum: Constants.emailActionTypes },
        data: { type: mongoose.Schema.Types.Mixed },
    },
    { _id: false },
);

const EmailContentSchema = new mongoose.Schema(
    {
        content: { type: [EmailContentBlockSchema], required: true },
        style: { type: EmailStyleSchema, required: true },
        meta: { type: EmailMetaSchema, required: true },
    },
    { _id: false },
);

export const EmailSchema = new mongoose.Schema<Email>({
    emailId: { type: String, required: true, default: generateUniqueId },
    content: { type: EmailContentSchema, required: true },
    subject: { type: String, required: true },
    delayInMillis: { type: Number, required: true, default: 86400000 },
    published: { type: Boolean, required: true, default: false },
    action: EmailActionSchema,
});
