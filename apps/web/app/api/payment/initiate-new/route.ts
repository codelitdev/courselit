import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";
import User from "@models/User";
import { PaymentInitiateRequest } from "@models/payment-intiate-request";
import {
    Community,
    Constants,
    Course,
    PaymentPlan,
    Membership,
} from "@courselit/common-models";
import CommunityModel from "@models/Community";
import CourseModel from "@models/Course";
import MembershipModel from "@models/Membership";
import constants from "@config/constants";
import PaymentPlanModel from "@models/PaymentPlan";
import { getPaymentMethodFromSettings } from "@/payments-new";

const { transactionSuccess, transactionFailed, transactionInitiated } =
    constants;

export async function POST(req: NextRequest) {
    const body: PaymentInitiateRequest = await req.json();
    const domainName = req.headers.get("domain");

    try {
        const domain = await DomainModel.findOne<Domain>({
            name: domainName,
        });
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }
        const session = await auth();

        let user;
        if (session) {
            user = await User.findOne({
                email: session.user!.email,
                domain: domain._id,
                active: true,
            });
        }

        if (!user) {
            return Response.json({}, { status: 401 });
        }

        const { id, type, planId, metadata } = body;

        if (!id || !type || !planId) {
            return Response.json({ message: "Bad request" }, { status: 400 });
        }

        let entity: Community | Course | null = null;
        if (type === Constants.MembershipEntityType.COMMUNITY) {
            entity = await CommunityModel.findOne<Community>({
                communityId: id,
                domain: domain._id,
            });
        } else if (type === Constants.MembershipEntityType.COURSE) {
            entity = await CourseModel.findOne<Course>({
                courseId: id,
                domain: domain._id,
            });
        } else {
            return Response.json({ message: "Invalid type" }, { status: 400 });
        }

        const existingActiveMembership =
            await MembershipModel.findOne<Membership>({
                domain: domain._id,
                userId: user.userId,
                entityType: type,
                entityId: id,
                status: Constants.MembershipStatus.ACTIVE,
            });

        if (existingActiveMembership) {
            return Response.json({ status: transactionSuccess });
        }

        const paymentPlan = await PaymentPlanModel.findOne<PaymentPlan>({
            domain: domain._id,
            planId,
            archived: false,
        });

        if (!paymentPlan) {
            return Response.json(
                { message: "Invalid payment plan" },
                { status: 400 },
            );
        }

        if (paymentPlan.type === Constants.PaymentPlanType.FREE) {
            await MembershipModel.create({
                domain: domain._id,
                userId: user.userId,
                paymentPlanId: planId,
                entityId: id,
                entityType: type,
                status: Constants.MembershipStatus.ACTIVE,
            });
            // TODO: implement finalizePurchase
            return Response.json({ status: transactionSuccess });
        }

        const siteinfo = domain.settings;
        const paymentMethod = await getPaymentMethodFromSettings(siteinfo);

        const existingPendingMembership =
            await MembershipModel.findOne<Membership>({
                domain: domain._id,
                userId: user.userId,
                entityId: id,
                entityType: type,
                status: Constants.MembershipStatus.PENDING,
            });

        let membership: Membership;

        if (existingPendingMembership) {
            membership = existingPendingMembership;
        } else {
            membership = await MembershipModel.create({
                domain: domain._id,
                userId: user.userId,
                paymentPlanId: planId,
                entityId: id,
                entityType: type,
                status: Constants.MembershipStatus.PENDING,
            });
        }

        metadata["membershipId"] = membership.membershipId;

        const paymentTracker = await paymentMethod.initiate({
            metadata,
            paymentPlan,
            product: {
                title:
                    type === Constants.MembershipEntityType.COMMUNITY
                        ? (entity as Community)!.name
                        : (entity as Course)!.title,
                type,
            },
        });

        return Response.json({
            status: transactionInitiated,
            paymentTracker,
        });
    } catch (err: any) {
        return Response.json(
            { status: transactionFailed, error: err.message },
            { status: 500 },
        );
    }
}
