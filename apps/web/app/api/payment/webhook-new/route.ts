import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import MembershipModel from "@models/Membership";
import { getPaymentMethod } from "@/payments-new";
import {
    Community,
    Constants,
    Invoice,
    Membership,
    PaymentPlan,
    Progress,
    User,
} from "@courselit/common-models";
import { triggerSequences } from "@/lib/trigger-sequences";
import { recordActivity } from "@/lib/record-activity";
import constants from "@config/constants";
import PaymentPlanModel from "@models/PaymentPlan";
import InvoiceModel from "@models/Invoice";
import CourseModel, { Course as InternalCourse } from "@models/Course";
import { getPlanPrice } from "@ui-lib/utils";
import UserModel from "@models/User";
import { error } from "@/services/logger";
import mongoose from "mongoose";
import Payment from "@/payments-new/payment";
import CommunityModel from "@models/Community";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const domainName = req.headers.get("domain");

        const domain = await getDomain(domainName);
        if (!domain) {
            return Response.json(
                { message: "Domain not found" },
                { status: 404 },
            );
        }

        const paymentMethod = await getPaymentMethod(domain._id.toString());
        if (!paymentMethod.verify(body)) {
            return Response.json({ message: "Payment not verified" });
        }

        const metadata = paymentMethod.getMetadata(body);
        const { membershipId, invoiceId, currencyISOCode } = metadata;

        const membership = await getMembership(domain._id, membershipId);
        if (!membership) {
            return Response.json({ message: "Membership not found" });
        }

        const paymentPlan = await getPaymentPlan(
            domain._id,
            membership.paymentPlanId!,
        );
        const subscriptionId = await handleSubscription(
            paymentPlan,
            paymentMethod,
            body,
            membership,
        );

        await handleInvoice(
            domain,
            invoiceId,
            membershipId,
            paymentPlan,
            paymentMethod,
            currencyISOCode,
            body,
        );

        if (
            paymentPlan?.type === Constants.PaymentPlanType.EMI &&
            subscriptionId
        ) {
            await handleEMICancellation(
                domain._id,
                membershipId,
                paymentPlan,
                subscriptionId,
                paymentMethod,
            );
        }

        await activateMembership(domain, membership, paymentPlan);

        return Response.json({ message: "success" });
    } catch (e) {
        error(`Error in payment webhook: ${e.message}`, {
            domain: req.headers.get("domain"),
            stack: e.stack,
        });
        return Response.json({ message: e.message }, { status: 400 });
    }
}

async function getDomain(domainName: string | null) {
    return DomainModel.findOne<Domain>({ name: domainName });
}

async function getMembership(
    domainId: mongoose.Types.ObjectId,
    membershipId: string,
) {
    return MembershipModel.findOne<Membership>({
        domain: domainId,
        membershipId,
    });
}

async function getPaymentPlan(
    domainId: mongoose.Types.ObjectId,
    paymentPlanId: string,
) {
    return PaymentPlanModel.findOne<PaymentPlan>({
        domain: domainId,
        planId: paymentPlanId,
    });
}

async function handleSubscription(
    paymentPlan: PaymentPlan | null,
    paymentMethod: Payment,
    body: any,
    membership: Membership,
) {
    let subscriptionId: string | null = null;
    if (
        paymentPlan?.type === Constants.PaymentPlanType.SUBSCRIPTION ||
        paymentPlan?.type === Constants.PaymentPlanType.EMI
    ) {
        subscriptionId = paymentMethod.getSubscriptionId(body);
        if (!membership.subscriptionId) {
            membership.subscriptionId = subscriptionId;
            membership.subscriptionMethod = paymentMethod.getName();
            await (membership as any).save();
        }
    }
    return subscriptionId;
}

async function handleInvoice(
    domain: Domain,
    invoiceId: string,
    membershipId: string,
    paymentPlan: PaymentPlan | null,
    paymentMethod: any,
    currencyISOCode: string,
    body: any,
) {
    const invoice = await InvoiceModel.findOne<Invoice>({
        domain: domain._id,
        invoiceId,
        status: Constants.InvoiceStatus.PENDING,
    });
    if (invoice) {
        invoice.paymentProcessorTransactionId =
            paymentMethod.getPaymentIdentifier(body);
        invoice.status = Constants.InvoiceStatus.PAID;
        await (invoice as any).save();
    } else {
        await InvoiceModel.create({
            domain: domain._id,
            membershipId,
            amount:
                paymentPlan?.oneTimeAmount ||
                paymentPlan?.subscriptionYearlyAmount ||
                paymentPlan?.subscriptionMonthlyAmount ||
                paymentPlan?.emiAmount ||
                0,
            status: Constants.InvoiceStatus.PAID,
            paymentProcessor: paymentMethod.name,
            paymentProcessorTransactionId:
                paymentMethod.getPaymentIdentifier(body),
            currencyISOCode,
        });
    }
}

async function handleEMICancellation(
    domainId: mongoose.Types.ObjectId,
    membershipId: string,
    paymentPlan: PaymentPlan,
    subscriptionId: string,
    paymentMethod: any,
) {
    const paidInvoicesCount = await InvoiceModel.countDocuments({
        domain: domainId,
        membershipId,
        status: Constants.InvoiceStatus.PAID,
    });
    if (paidInvoicesCount >= paymentPlan.emiTotalInstallments!) {
        await paymentMethod.cancel(subscriptionId);
    }
}

export async function activateMembership(
    domain: Domain,
    membership: Membership,
    paymentPlan: PaymentPlan | null,
) {
    if (membership.status === Constants.MembershipStatus.ACTIVE) {
        return;
    }

    if (
        membership.entityType === Constants.MembershipEntityType.COMMUNITY &&
        paymentPlan?.type === Constants.PaymentPlanType.FREE
    ) {
        const community = await CommunityModel.findOne<Community>({
            communityId: membership.entityId,
        });
        if (community) {
            membership.status = community.autoAcceptMembers
                ? Constants.MembershipStatus.ACTIVE
                : Constants.MembershipStatus.PENDING;
            membership.joiningReason = community.autoAcceptMembers
                ? `Auto accepted`
                : membership.joiningReason;
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
    domain: Domain;
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
                cost: getPlanPrice(paymentPlan).amount,
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
    cost,
}: {
    user: User;
    product: InternalCourse;
    cost: number;
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
        if (!product.customers.some((customer) => customer === user.userId)) {
            product.customers.push(user.userId);
            product.sales += product.cost;
            await (product as any).save();
        }
    }
}

export async function GET(req: NextRequest) {
    return Response.json({ message: "success" });
}
