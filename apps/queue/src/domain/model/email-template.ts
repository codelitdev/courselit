import mongoose from "mongoose";
import { EmailTemplate as PublicEmailTemplate } from "@courselit/common-models";

interface EmailTemplate extends PublicEmailTemplate {
    domain: mongoose.Schema.Types.ObjectId;
    creatorId: string;
}

const EmailTemplateSchema = new mongoose.Schema<EmailTemplate>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    templateId: { type: String, required: true },
    title: { type: String, required: true },
    creatorId: { type: String, required: true },
    content: { type: String, required: true },
});

EmailTemplateSchema.index(
    {
        domain: 1,
        title: 1,
    },
    { unique: true },
);

export default mongoose.models.EmailTemplate ||
    mongoose.model("EmailTemplate", EmailTemplateSchema);
