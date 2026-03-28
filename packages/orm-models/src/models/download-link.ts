import mongoose from "mongoose";

export interface DownloadLink {
    domain: mongoose.Types.ObjectId;
    courseId: string;
    userId: string;
    token: string;
    expiresAt: Date;
    consumed: boolean;
}

// const generateUniqueToken = (): string =>
//     randomBytes(constants.downLoadLinkLength).toString("hex");

// const getDateAfter24Hours = (): Date => {
//     const now = new Date();
//     now.setDate(now.getDate() + constants.downLoadLinkExpiresInDays);
//     return now;
// };

export const DownloadLinkSchema = new mongoose.Schema<DownloadLink>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: String, required: true },
    userId: { type: String, required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, required: true, default: false },
});
