import { CommunityMember, Constants } from "@courselit/common-models";
import mongoose from "mongoose";

export interface InnerCommunityMember extends CommunityMember {
    domain: mongoose.Types.ObjectId;
}

const CommunityMemberSchema = new mongoose.Schema<InnerCommunityMember>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        communityId: { type: String, required: true },
        userId: { type: String, required: true },
        status: {
            type: String,
            enum: Constants.communityMemberStatus,
            required: true,
        },
        joiningReason: { type: String },
        rejectionReason: { type: String },
    },
    {
        timestamps: true,
    },
);

CommunityMemberSchema.index({ communityId: 1, userId: 1 }, { unique: true });

CommunityMemberSchema.statics.paginatedFind = async function (filter, options) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter).skip(skip).limit(limit).exec();
    return docs;
};

export default mongoose.models.CommunityMember ||
    mongoose.model("CommunityMember", CommunityMemberSchema);
