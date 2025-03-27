import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import MembershipModel from "@models/Membership";
import { getPaymentMethod } from "@/payments-new";
import {
    Constants,
    Invoice,
    Membership,
    PaymentPlan,
} from "@courselit/common-models";
import PaymentPlanModel from "@models/PaymentPlan";
import InvoiceModel from "@models/Invoice";
import { error } from "@/services/logger";
import mongoose from "mongoose";
import Payment from "@/payments-new/payment";
import { activateMembership } from "../helpers";

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
        if (!paymentMethod) {
            return Response.json({ message: "Payment method not found" });
        }

        if (!(await paymentMethod.verify(body))) {
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
            membership,
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
                membership,
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
    membership: Membership,
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
            membershipId: membership.membershipId,
            membershipSessionId: membership.sessionId,
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
    membership: Membership,
    paymentPlan: PaymentPlan,
    subscriptionId: string,
    paymentMethod: any,
) {
    const paidInvoicesCount = await InvoiceModel.countDocuments({
        domain: domainId,
        membershipId: membership.membershipId,
        status: Constants.InvoiceStatus.PAID,
        membershipSessionId: membership.sessionId,
    });
    if (paidInvoicesCount >= paymentPlan.emiTotalInstallments!) {
        await paymentMethod.cancel(subscriptionId);
    }
}

export async function GET(req: NextRequest) {
    return Response.json({ message: "success" });
}
