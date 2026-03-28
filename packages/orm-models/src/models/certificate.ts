import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalCertificate {
    domain: mongoose.Types.ObjectId;
    certificateId: string;
    userId: string;
    courseId: string;
    createdAt: Date;
    updatedAt: Date;
}

export const CertificateSchema = new mongoose.Schema<InternalCertificate>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        certificateId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        userId: { type: String, required: true },
        courseId: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);
