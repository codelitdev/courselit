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
import MembershipModel, { InternalMembership } from "@models/Membership";
import constants from "@config/constants";
import PaymentPlanModel from "@models/PaymentPlan";
import { getPaymentMethodFromSettings } from "@/payments-new";
import { generateUniqueId } from "@courselit/utils";
import Invoice from "@models/Invoice";
import { error } from "@/services/logger";
import { finalizePurchase } from "../webhook-new/route";
import { responses } from "@config/strings";

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

        if (!entity) {
            return Response.json(
                { message: responses.item_not_found },
                { status: 400 },
            );
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

        const siteinfo = domain.settings;
        const paymentMethod = await getPaymentMethodFromSettings(siteinfo);

        const existingMembership =
            await MembershipModel.findOne<InternalMembership>({
                domain: domain._id,
                userId: user.userId,
                entityType: type,
                entityId: id,
            });
        let membership: InternalMembership =
            existingMembership ||
            (await MembershipModel.create({
                domain: domain._id,
                userId: user.userId,
                paymentPlanId: planId,
                entityId: id,
                entityType: type,
                status: Constants.MembershipStatus.PENDING,
            }));

        if (membership.status === Constants.MembershipStatus.ACTIVE) {
            if (paymentPlan.type === Constants.PaymentPlanType.FREE) {
                return Response.json({ status: transactionSuccess });
            }
            if (
                membership.subscriptionId &&
                (paymentPlan.type === Constants.PaymentPlanType.EMI ||
                    paymentPlan.type === Constants.PaymentPlanType.SUBSCRIPTION)
            ) {
                if (
                    await paymentMethod.validateSubscription(
                        membership.subscriptionId,
                    )
                ) {
                    return Response.json({ status: transactionSuccess });
                } else {
                    membership.status = Constants.MembershipStatus.FAILED;
                    await membership.save();
                }
            }
        }

        if (paymentPlan.type === Constants.PaymentPlanType.FREE) {
            membership.status = Constants.MembershipStatus.ACTIVE;
            await (membership as any).save();
            await finalizePurchase({
                domain,
                membership,
                paymentPlan,
            });
            return Response.json({ status: transactionSuccess });
        }

        const invoiceId = generateUniqueId();
        metadata["membershipId"] = membership.membershipId;
        metadata["invoiceId"] = invoiceId;

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

        await Invoice.create({
            domain: domain._id,
            invoiceId,
            membershipId: membership.membershipId,
            amount:
                paymentPlan.oneTimeAmount ||
                paymentPlan.subscriptionMonthlyAmount ||
                paymentPlan.subscriptionYearlyAmount ||
                paymentPlan.emiAmount ||
                0,
            status: Constants.InvoiceStatus.PENDING,
            paymentProcessor: paymentMethod.name,
            paymentProcessorTransactionId: paymentTracker,
        });

        await (membership as any).save();

        return Response.json({
            status: transactionInitiated,
            paymentTracker,
        });
    } catch (err: any) {
        error(`Error initiating payment: ${err.message}`, {
            domain: domainName,
            body,
            stack: err.stack,
        });
        return Response.json(
            { status: transactionFailed, error: err.message },
            { status: 500 },
        );
    }
}
