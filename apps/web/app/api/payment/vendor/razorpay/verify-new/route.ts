import { error, info } from "@/services/logger";
import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { responses } from "@config/strings";
import Invoice from "@models/Invoice";
import { UIConstants } from "@courselit/common-models";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const domainName = req.headers.get("domain");
    const { signature, paymentId, subscriptionId, orderId } = body;
    if (!signature || !paymentId) {
        return Response.json({ message: "Bad request" }, { status: 400 });
    }
    info(
        `POST /api/payment/vendor/razorpay/verify: domain detected: ${domainName}`,
    );

    const domain = await DomainModel.findOne<Domain>({
        name: domainName,
    });
    if (!domain) {
        return Response.json({ message: "Domain not found" }, { status: 404 });
    }

    if (!domain.settings.razorpayKey || !domain.settings.razorpaySecret) {
        return Response.json(
            { message: "Invalid Razorpay settings" },
            { status: 500 },
        );
    }

    let isVerified = false;
    if (subscriptionId) {
        isVerified = validatePaymentVerification(
            { subscription_id: subscriptionId, payment_id: paymentId },
            signature,
            domain.settings.razorpaySecret,
        );
    } else {
        isVerified = validatePaymentVerification(
            { order_id: orderId, payment_id: paymentId },
            signature,
            domain.settings.razorpaySecret,
        );
    }

    if (isVerified) {
        const invoice = await Invoice.findOne({
            domain: domain._id,
            paymentProcessor: UIConstants.PAYMENT_METHOD_RAZORPAY,
            paymentProcessorEntityId: subscriptionId || orderId,
        });
        return Response.json({
            message: responses.success,
            purchaseId: invoice?.invoiceId,
        });
    }

    error(`Could not verify signature`, {
        domain: domain._id,
        domainName: domain.name,
        orderId,
        paymentId,
        signature,
    });

    return Response.json({ error: "Verification failed" }, { status: 400 });
}
