import { NextApiRequest, NextApiResponse } from "next";
import constants from "@/config/constants";
import finalizePurchase from "@/lib/finalize-purchase";
import PurchaseModel, { Purchase } from "@/models/Purchase";
import { getPaymentMethod } from "@/payments";
const { transactionSuccess } = constants;
import DomainModel, { Domain } from "@models/Domain";
import { info, error } from "@/services/logger";
import ActivityModel from "@/models/Activity";

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
        error(`Domain not found: ${req.headers.domain}`);
        return res.status(404).json({ message: "Domain not found" });
    }

    const { body } = req;
    console.log("Webhook body:", JSON.stringify(body));
    info(`Webhook body received for domain: ${domain.name}`);
    
    const paymentMethod = await getPaymentMethod(domain._id.toString());
    console.log("Payment method:", paymentMethod.getName());
    
    const paymentVerified = await paymentMethod.verify(body);
    console.log("Payment verified:", paymentVerified);
    info(`Payment verification result: ${paymentVerified}`);
    
    if (paymentVerified) {
        const purchaseId = await paymentMethod.getPaymentIdentifier(body);
        console.log("Purchase ID:", purchaseId);
        
        const purchaseRecord: Purchase | null = await PurchaseModel.findOne({
            orderId: purchaseId,
        });
        console.log("Purchase Record:", purchaseRecord);
        
        if (!purchaseRecord) {
            error(`Purchase record not found for ID: ${purchaseId}`);
            return res.status(200).json({
                message: "fail",
            });
        }

        purchaseRecord.status = transactionSuccess;
        purchaseRecord.webhookPayload = body;
        await (purchaseRecord as any).save();
        console.log("Purchase record updated with success status");
        info(`Purchase record updated with success status for ID: ${purchaseId}`);

        // Check for existing activities before finalizing purchase
        const existingActivities = await ActivityModel.find({
            domain: domain._id,
            entityId: purchaseRecord.courseId
        });
        console.log("Existing activities before finalize:", existingActivities);

        await finalizePurchase(
            purchaseRecord.purchasedBy,
            purchaseRecord.courseId,
            purchaseRecord.orderId,
        );
        console.log("Purchase finalized");
        info(`Purchase finalized for user: ${purchaseRecord.purchasedBy}, course: ${purchaseRecord.courseId}`);

        // Check for activities after finalizing purchase
        const newActivities = await ActivityModel.find({
            domain: domain._id,
            entityId: purchaseRecord.courseId
        });
        console.log("Activities after finalize:", newActivities);

        res.status(200).json({
            message: "success",
        });
    } else {
        error("Payment verification failed");
        res.status(200).json({
            message: "fail",
        });
    }
}
