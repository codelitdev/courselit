import {
    Community,
    Domain,
    Constants,
    Membership,
    PaymentPlan,
} from "@courselit/common-models";
import CommunityModel from "@models/Community";
import mongoose from "mongoose";
import { addIncludedProductsMemberships } from "@/graphql/paymentplans/logic";
import { runPostMembershipTasks } from "@/graphql/users/logic";

export async function activateMembership(
    domain: Domain & { _id: mongoose.Types.ObjectId },
    membership: Membership,
    paymentPlan: PaymentPlan | null,
) {
    if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return;
    }

    if (membership.entityType === Constants.MembershipEntityType.COMMUNITY) {
        if (paymentPlan?.type === Constants.PaymentPlanType.FREE) {
            const community = await CommunityModel.findOne<Community>({
                communityId: membership.entityId,
            });
            if (community) {
                membership.status = community.autoAcceptMembers
                    ? Constants.MembershipStatus.ACTIVE
                    : Constants.MembershipStatus.PENDING;
                (membership.role = community.autoAcceptMembers
                    ? Constants.MembershipRole.POST
                    : Constants.MembershipRole.COMMENT),
                    (membership.joiningReason = community.autoAcceptMembers
                        ? `Auto accepted`
                        : membership.joiningReason);
            }
        } else {
            membership.status = Constants.MembershipStatus.ACTIVE;
            membership.role = Constants.MembershipRole.POST;
        }
        if (
            membership.status === Constants.MembershipStatus.ACTIVE &&
            paymentPlan &&
            paymentPlan.includedProducts &&
            paymentPlan.includedProducts.length > 0
        ) {
            await addIncludedProductsMemberships({
                domain: domain._id,
                userId: membership.userId,
                paymentPlan,
                sessionId: membership.sessionId,
            });
        }
    } else {
        membership.status = Constants.MembershipStatus.ACTIVE;
    }

    await (membership as any).save();

    if (paymentPlan) {
        await runPostMembershipTasks({
            domain: domain._id,
            membership,
            paymentPlan,
        });
    }
}
