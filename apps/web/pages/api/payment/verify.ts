import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import { responses } from "../../../config/strings";
import connectDb from "../../../middlewares/connect-db";
import setUserFromSession from "../../../middlewares/set-user-from-session";
import verifyDomain from "../../../middlewares/verify-domain";
import ApiRequest from "../../../models/ApiRequest";
import PurchaseModel, { Purchase } from "../../../models/Purchase";
import { error } from "../../../services/logger";

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        error(err.message, {
            fileName: `/api/payment/verify.ts`,
            stack: err.stack,
        });
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
    attachParams: true,
})
    .use(connectDb)
    .use(verifyDomain)
    .use(setUserFromSession)
    .post(verifyHandler);

async function verifyHandler(req: ApiRequest, res: NextApiResponse) {
    const { user } = req;
    const { purchaseId } = req.body;

    if (!purchaseId) {
        return res.status(400).json({ message: responses.invalid_input });
    }

    try {
        const purchaseRecord: Purchase | null = await PurchaseModel.findOne({
            orderId: purchaseId,
        });

        if (!purchaseRecord || user!.userId !== purchaseRecord.purchasedBy) {
            return res.status(404).json({ message: responses.item_not_found });
        }

        res.status(200).json({
            status: purchaseRecord.status,
        });
    } catch (err: any) {
        console.error(err.message, err.stack); // eslint-disable-line no-console
        res.status(500).json({
            message: err.message,
        });
    }
}
