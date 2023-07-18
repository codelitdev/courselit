import { randomBytes } from "crypto";
import mongoose from "mongoose";
import constants from "../config/constants";

export interface DownloadLink {
    domain: mongoose.Types.ObjectId;
    courseId: string;
    userId: string;
    token: string;
    expiresAt: Date;
    consumed: boolean;
}

const generateUniqueToken = (): string =>
    randomBytes(constants.downLoadLinkLength).toString("hex");

const getDateAfter24Hours = (): Date => {
    const now = new Date();
    now.setDate(now.getDate() + constants.downLoadLinkExpiresInDays);
    return now;
};

const DownloadLinkSchema = new mongoose.Schema<DownloadLink>({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    courseId: { type: String, required: true },
    userId: { type: String, required: true },
    token: { type: String, required: true, default: generateUniqueToken },
    expiresAt: { type: Date, required: true, default: getDateAfter24Hours },
    consumed: { type: Boolean, required: true, default: false },
});

export default mongoose.models.DownloadLink ||
    mongoose.model("DownloadLink", DownloadLinkSchema);
