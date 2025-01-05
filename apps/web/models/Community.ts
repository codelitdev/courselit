import { Community } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";
import mongoose from "mongoose";
import MediaSchema from "./Media";

export interface InternalCommunity extends Omit<Community, "paymentPlans"> {
    domain: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    paymentPlans: string[];
}

const CommunitySchema = new mongoose.Schema<InternalCommunity>(
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
        paymentPlans: [String],
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
    const skip = (page - 1) * limit;

    const docs = await this.find(filter).skip(skip).limit(limit).exec();
    return docs;
};

export default mongoose.models.Community ||
    mongoose.model("Community", CommunitySchema);
