import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import MembershipModel from "@models/Membership";
import { getPaymentMethod } from "@/payments-new";
import {
    Community,
    Constants,
    Course,
    Invoice,
    Membership,
    MembershipEntityType,
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
import CommunityModel from "@models/Community";

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
        console.log(body);

        const metadata = paymentMethod.getMetadata(body);
        const { purchaseId: membershipId, invoiceId } = metadata;
        console.log("metadata", metadata);

        const membership = await MembershipModel.findOne<Membership>({
            domain: domain._id,
            membershipId,
        });

        if (!membership) {
            return Response.json({ message: "Membership not found" });
        }

        const paymentPlan = await PaymentPlanModel.findOne<PaymentPlan>({
            domain: domain._id,
            planId: membership.paymentPlanId,
        });
        let subscriptionId;
        console.log("paymentPlan", paymentPlan);
        if (
            paymentPlan?.type === Constants.PaymentPlanType.SUBSCRIPTION ||
            paymentPlan?.type === Constants.PaymentPlanType.EMI
        ) {
            subscriptionId = paymentMethod.getSubscriptionId(body);
            console.log("subscriptionId", subscriptionId);
            if (!membership.subscriptionId) {
                membership.subscriptionId = subscriptionId;
            }
            console.log(
                "subscriptionId",
                subscriptionId,
                membership.subscriptionId,
            );
        }
        const invoice = await InvoiceModel.findOne<Invoice>({ invoiceId });
        if (invoice) {
            invoice.status = Constants.InvoiceStatus.PAID;
            await (invoice as any).save();
        } else {
            await InvoiceModel.create({
                domain: domain._id,
                invoiceId,
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
            });
        }

        console.log("PaymentPlan", paymentPlan);
        if (paymentPlan?.type === Constants.PaymentPlanType.EMI) {
            const paidInvoicesCount = await InvoiceModel.countDocuments({
                domain: domain._id,
                membershipId,
                status: Constants.InvoiceStatus.PAID,
            });
            console.log(
                "Paid invoices count",
                paidInvoicesCount,
                paymentPlan.emiTotalInstallments,
            );
            if (paidInvoicesCount >= paymentPlan.emiTotalInstallments!) {
                await paymentMethod.cancel(subscriptionId);
            }
        }

        if (membership.status !== Constants.MembershipStatus.ACTIVE) {
            membership.status = Constants.MembershipStatus.ACTIVE;
            await (membership as any).save();


            await finalizePurchase({
                domain,
                membership,
                paymentPlan!,
            });

        }

        return Response.json({ message: "success" });
    } catch (e) {
        console.error(e.message);
        return Response.json({ message: e.message }, { status: 400 });
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
    const user = await UserModel.findOne<User>({
        userId: membership.userId,
    });
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
        await triggerSequences({
            user,
            event,
            data: membership.entityId,
        });
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