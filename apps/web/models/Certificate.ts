import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface Certificate {
    domain: mongoose.Types.ObjectId;
    certificateId: string;
    userId: string;
    courseId: string;
    createdAt: Date;
    updatedAt: Date;
}

const CertificateSchema = new mongoose.Schema(
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

export default mongoose.models.Certificate ||
    mongoose.model("Certificate", CertificateSchema);
