import { Community } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import { MediaSchema } from "./media";

export interface InternalCommunity extends Omit<Community, "paymentPlans"> {
    _id: mongoose.Types.ObjectId;
    domain: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    deleted: boolean;
}

export const CommunitySchema = new mongoose.Schema<InternalCommunity>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        communityId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        name: { type: String, required: true },
        description: { type: mongoose.Schema.Types.Mixed, default: null },
        banner: { type: mongoose.Schema.Types.Mixed, default: null },
        enabled: { type: Boolean, default: false },
        categories: { type: [String], default: ["General"] },
        autoAcceptMembers: { type: Boolean, default: false },
        joiningReasonText: { type: String },
        pageId: { type: String, required: true },
        defaultPaymentPlan: { type: String },
        featuredImage: MediaSchema,
        deleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

CommunitySchema.index({ domain: 1, name: 1 }, { unique: true });

CommunitySchema.statics.paginatedFind = async function (filter, options) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const sort = options.sort || -1;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter)
        .sort({ createdAt: sort })
        .skip(skip)
        .limit(limit)
        .exec();
    return docs;
};

const CommunityModel =
    mongoose.models.Community ||
    mongoose.model<InternalCommunity>("Community", CommunitySchema);

export default CommunityModel;
