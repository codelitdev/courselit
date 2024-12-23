import type { Membership, MembershipPayment } from "@courselit/common-models";
import mongoose from "mongoose";
import { Constants } from "@courselit/common-models";
import { generateUniqueId } from "@courselit/utils";

const { MembershipEntityType, MembershipStatus, MembershipPaymentStatus } =
    Constants;

export interface InternalMembership extends Membership {
    domain: mongoose.Types.ObjectId;
}

const MembershipPaymentSchema = new mongoose.Schema<MembershipPayment>(
    {
        installmentNumber: { type: Number, required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: Object.values(MembershipPaymentStatus),
            required: true,
        },
        paymentProcessor: { type: String, required: true },
        paymentProcessorTransactionId: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

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
        paymentPlanId: { type: String, required: true },
        entityId: { type: String, required: true },
        entityType: {
            type: String,
            enum: Object.values(MembershipEntityType),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(MembershipStatus),
            default: MembershipStatus.PENDING,
        },
        paymentHistory: [MembershipPaymentSchema],
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

export default mongoose.models.Membership ||
    mongoose.model("Membership", MembershipSchema);
