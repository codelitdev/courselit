import { NextApiRequest, NextApiResponse } from "next";
import constants from "@/config/constants";
import finalizePurchase from "@/lib/finalize-purchase";
import PurchaseModel, { Purchase } from "@/models/Purchase";
import { getPaymentMethod } from "@/payments";
const { transactionSuccess } = constants;
import DomainModel, { Domain } from "@models/Domain";
import { info } from "@/services/logger";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Not allowed" });
    }

    info(`POST /api/payment/webhook: domain detected: ${req.headers.domain}`);

    const domain = await DomainModel.findOne<Domain>({
        name: req.headers.domain,
    });
    if (!domain) {
        return res.status(404).json({ message: "Domain not found" });
    }

    const { body } = req;
    const paymentMethod = await getPaymentMethod(domain._id.toString());
    const paymentVerified = paymentMethod.verify(body);
    if (paymentVerified) {
        const purchaseId = paymentMethod.getPaymentIdentifier(body);
        const purchaseRecord: Purchase | null = await PurchaseModel.findOne({
            orderId: purchaseId,
        });

        if (!purchaseRecord) {
            return res.status(200).json({
                message: "fail",
            });
        }

        purchaseRecord.status = transactionSuccess;
        purchaseRecord.webhookPayload = body;
        await (purchaseRecord as any).save();

        await finalizePurchase(
            purchaseRecord.purchasedBy,
            purchaseRecord.courseId,
            purchaseRecord.orderId,
        );

        res.status(200).json({
            message: "success",
        });
    } else {
        res.status(200).json({
            message: "fail",
        });
    }
}
