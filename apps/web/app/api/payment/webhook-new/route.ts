import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import MembershipModel from "@models/Membership";
import { getPaymentMethod } from "@/payments-new";
import {
    Community,
    Constants,
    Course,
    Membership,
    PaymentPlan,
    User,
} from "@courselit/common-models";
import { triggerSequences } from "@/lib/trigger-sequences";
import { recordActivity } from "@/lib/record-activity";
import constants from "@config/constants";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const domainName = req.headers.get("domain");

        const domain = await DomainModel.findOne<Domain>({
            name: domainName,
        });
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }

        const paymentMethod = await getPaymentMethod(domain._id.toString());
        const paymentVerified = paymentMethod.verify(body);

        if (!paymentVerified) {
            return Response.json({ message: "Payment not verified" });
        }

        const { purchaseId: membershipId } = paymentMethod.getMetadata(body);

        const membership = await MembershipModel.findOne<Membership>({
            domain: domain._id,
            membershipId,
        });

        if (!membership) {
            return Response.json({ message: "Membership not found" });
        }

        membership.status = Constants.MembershipStatus.ACTIVE;
        const currentDate = new Date();
        membership.paymentHistory.push({
            installmentNumber: 1,
            amount: 100,
            status: Constants.MembershipPaymentStatus.PAID,
            paymentProcessor: paymentMethod.name,
            paymentProcessorTransactionId:
                paymentMethod.getPaymentIdentifier(body),
            createdAt: currentDate,
            updatedAt: currentDate,
        });
        await (membership as any).save();

        return Response.json({ message: "success" });
    } catch (e) {
        return Response.json({ message: e.message }, { status: 400 });
    }
}

export async function GET(req: NextRequest) {
    return Response.json({ message: "success" });
}

async function finalizePurchase({
    membership,
    paymentPlan,
    user,
    entity,
    domain,
}: {
    membership: Membership;
    paymentPlan: PaymentPlan;
    user: User;
    entity: Course | Community;
    domain: Domain;
}) {
    let event: (typeof Constants.eventTypes)[number] | undefined = undefined;
    let data: string | undefined = undefined;
    if (membership.entityType === Constants.MembershipEntityType.COMMUNITY) {
        // Add user to community
        event = Constants.eventTypes[5];
        data = (entity as Community).communityId;
    }
    if (membership.entityType === Constants.MembershipEntityType.COURSE) {
        // Add user to course
        event = Constants.eventTypes[2];
        data = (entity as Course).courseId;
    }

    if (event && data) {
        await triggerSequences({
            user,
            event,
            data,
        });
    }

    await recordActivity({
        domain: domain._id,
        userId: user.userId,
        type: constants.activityTypes[0],
        entityId: data,
    });

    if (paymentPlan.type !== Constants.PaymentPlanType.FREE) {
        await recordActivity({
            domain: domain._id,
            userId: user.userId,
            type: constants.activityTypes[1],
            entityId: data,
        });
    }
}
