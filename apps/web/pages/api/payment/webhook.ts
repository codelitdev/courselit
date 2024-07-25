import { NextApiRequest, NextApiResponse } from "next";
// import nc from "next-connect";
import constants from "../../../config/constants";
import finalizePurchase from "../../../lib/finalize-purchase";
// import connectDb from "../../../middlewares/connect-db";
// import verifyDomain from "../../../middlewares/verify-domain";
// import ApiRequest from "../../../models/ApiRequest";
import PurchaseModel, { Purchase } from "../../../models/Purchase";
import { getPaymentMethod } from "../../../payments";
// import { error } from "../../../services/logger";
const { transactionSuccess } = constants;
import DomainModel, { Domain } from "@models/Domain";

// export default nc<NextApiRequest, NextApiResponse>({
//     onError: (err, req, res, next) => {
//         error(err.message, {
//             fileName: `/api/payment/webhook.ts`,
//             stack: err.stack,
//         });
//         res.status(500).json({ error: err.message });
//     },
//     onNoMatch: (req, res) => {
//         res.status(404).end("Not found");
//     },
//     attachParams: true,
// })
//     .use(connectDb)
//     .use(verifyDomain)
//     .post(webhookHandler);

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse,
) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Not allowed" });
    }

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
