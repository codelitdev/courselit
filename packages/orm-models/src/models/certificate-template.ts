import { Media } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { MediaSchema } from "./media";

export interface InternalCertificateTemplate {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    templateId: string;
    courseId: string;
    title: string;
    subtitle: string;
    description: string;
    signatureImage: Media;
    signatureName: string;
    signatureDesignation?: string;
    logo?: Media;
    createdAt: Date;
    updatedAt: Date;
}

export const CertificateTemplateSchema =
    new mongoose.Schema<InternalCertificateTemplate>(
        {
            domain: { type: mongoose.Schema.Types.ObjectId, required: true },
            templateId: {
                type: String,
                required: true,
                unique: true,
                default: generateUniqueId,
            },
            courseId: { type: String, required: true },
            title: { type: String, required: true },
            subtitle: { type: String, required: true },
            description: { type: String, required: true },
            signatureImage: MediaSchema,
            signatureName: { type: String, required: true },
            signatureDesignation: { type: String },
            logo: MediaSchema,
        },
        {
            timestamps: true,
        },
    );

const CertificateTemplateModel =
    mongoose.models.CertificateTemplate ||
    mongoose.model<InternalCertificateTemplate>(
        "CertificateTemplate",
        CertificateTemplateSchema,
    );

export default CertificateTemplateModel;
