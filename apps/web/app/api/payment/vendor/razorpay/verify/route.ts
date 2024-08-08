import { error, info } from "@/services/logger";
import { NextRequest } from "next/server";
import DomainModel, { Domain } from "@models/Domain";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { responses } from "@config/strings";
import Purchase from "@models/Purchase";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const domainName = req.headers.get("domain");
    const { signature, paymentId, orderId } = body;
    if (!signature || !paymentId || !orderId) {
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

    if (
        validatePaymentVerification(
            { order_id: orderId, payment_id: paymentId },
            signature,
            domain.settings.razorpaySecret,
        )
    ) {
        const purchase = await Purchase.findOne({
            domain: domain._id,
            paymentId: orderId,
        });
        return Response.json({
            message: responses.success,
            purchaseId: purchase.orderId,
        });
    }

    error(`Could not verify signature`, {
        domain: domain._id,
        domainName: domain.name,
        orderId,
        paymentId,
        signature,
    });

    return Response.json({ error: "Verification failed" });
}
