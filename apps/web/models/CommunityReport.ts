import { CommunityReport, Constants } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";

export interface InternalCommunityReport
    extends Omit<CommunityReport, "user" | "content">,
        mongoose.Document {
    domain: mongoose.Types.ObjectId;
    userId: string;
    contentId: string;
}

const CommunityReportSchema = new mongoose.Schema<InternalCommunityReport>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        communityId: { type: String, required: true },
        reportId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        contentId: { type: String, required: true },
        type: { type: String, required: true },
        reason: { type: String, required: true },
        status: {
            type: String,
            required: true,
            default: Constants.CommunityReportStatus.PENDING,
        },
        userId: { type: String, required: true },
        contentParentId: { type: String },
        rejectionReason: { type: String },
    },
    {
        timestamps: true,
    },
);

CommunityReportSchema.statics.paginatedFind = async function (filter, options) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();
    return docs;
};

CommunityReportSchema.index(
    { communityId: 1, contentId: 1, userId: 1 },
    { unique: true },
);

export default mongoose.models.CommunityReport ||
    mongoose.model<InternalCommunityReport>(
        "CommunityReport",
        CommunityReportSchema,
    );
