import {
    Community,
    Domain,
    Constants,
    Membership,
    PaymentPlan,
    Progress,
} from "@courselit/common-models";
import { User } from "@courselit/common-models";
import { triggerSequences } from "@/lib/trigger-sequences";
import { recordActivity } from "@/lib/record-activity";
import constants from "@config/constants";
import CourseModel, { InternalCourse } from "@models/Course";
import { getPlanPrice } from "@ui-lib/utils";
import UserModel from "@models/User";
import CommunityModel from "@models/Community";
import mongoose from "mongoose";

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
    } else {
        membership.status = Constants.MembershipStatus.ACTIVE;
    }

    await (membership as any).save();

    if (paymentPlan) {
        await finalizePurchase({ domain, membership, paymentPlan });
    }
}

export async function finalizePurchase({
    domain,
    membership,
    paymentPlan,
}: {
    domain: Domain & { _id: mongoose.Types.ObjectId };
    membership: Membership;
    paymentPlan: PaymentPlan;
}) {
    const user = await UserModel.findOne<User>({ userId: membership.userId });
    if (!user) {
        return;
    }

    let event: (typeof Constants.eventTypes)[number] | undefined = undefined;
    if (paymentPlan.type !== Constants.PaymentPlanType.FREE) {
        await recordActivity({
            domain: domain._id,
            userId: user.userId,
            type: constants.activityTypes[1],
            entityId: membership.entityId,
            metadata: {
                cost: getPlanPrice(paymentPlan).amount,
                purchaseId: membership.sessionId,
            },
        });
    }
    if (membership.entityType === Constants.MembershipEntityType.COMMUNITY) {
        await recordActivity({
            domain: domain._id,
            userId: user.userId,
            type: constants.activityTypes[15],
            entityId: membership.entityId,
        });

        event = Constants.eventTypes[5];
    }
    if (membership.entityType === Constants.MembershipEntityType.COURSE) {
        const product = await CourseModel.findOne<InternalCourse>({
            courseId: membership.entityId,
        });
        if (product) {
            await addProductToUser({
                user,
                product,
                // cost: getPlanPrice(paymentPlan).amount,
            });
        }
        await recordActivity({
            domain: domain._id,
            userId: user.userId,
            type: constants.activityTypes[0],
            entityId: membership.entityId,
        });

        event = Constants.eventTypes[2];
    }

    if (event) {
        await triggerSequences({ user, event, data: membership.entityId });
    }
}

async function addProductToUser({
    user,
    product,
}: {
    user: User;
    product: InternalCourse;
}) {
    if (
        !user.purchases.some(
            (purchase: Progress) => purchase.courseId === product.courseId,
        )
    ) {
        user.purchases.push({
            courseId: product.courseId,
            completedLessons: [],
            accessibleGroups: [],
        });
        await (user as any).save();
    }
}
