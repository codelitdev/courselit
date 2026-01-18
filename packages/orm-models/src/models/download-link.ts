import mongoose from "mongoose";

export interface InternalDownloadLink {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    courseId: string;
    userId: string;
    token: string;
    expiresAt: Date;
    consumed: boolean;
}

export const DownloadLinkSchema = new mongoose.Schema<InternalDownloadLink>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: String, required: true },
    userId: { type: String, required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, required: true, default: false },
});

const DownloadLinkModel =
    mongoose.models.DownloadLink ||
    mongoose.model<InternalDownloadLink>("DownloadLink", DownloadLinkSchema);

export default DownloadLinkModel;
