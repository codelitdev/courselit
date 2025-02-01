import type { Membership } from "@courselit/common-models";
import mongoose, { Document } from "mongoose";
import { Constants } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";

const { MembershipEntityType, MembershipStatus, MembershipRole } = Constants;

export interface InternalMembership extends Membership, Document {
    domain: mongoose.Types.ObjectId;
}

const MembershipSchema = new mongoose.Schema<InternalMembership>(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        membershipId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        userId: { type: String, required: true },
        paymentPlanId: String,
        entityId: { type: String, required: true },
        entityType: {
            type: String,
            enum: Object.values(MembershipEntityType),
            required: true,
        },
        sessionId: { type: String, required: true, default: generateUniqueId },
        status: {
            type: String,
            enum: Object.values(MembershipStatus),
            default: MembershipStatus.PENDING,
        },
        role: {
            type: String,
            enum: Object.values(MembershipRole),
        },
        joiningReason: { type: String },
        rejectionReason: { type: String },
        subscriptionId: { type: String },
        subscriptionMethod: { type: String },
    },
    {
        timestamps: true,
    },
);

MembershipSchema.statics.paginatedFind = async function (filter, options) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    const docs = await this.find(filter).skip(skip).limit(limit).exec();
    return docs;
};

// MembershipSchema.index(
//     { domain: 1, userId: 1, entityId: 1, entityType: 1 },
//     { unique: true },
// );

export default mongoose.models.Membership ||
    mongoose.model("Membership", MembershipSchema);
