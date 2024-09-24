import { NextApiRequest, NextApiResponse } from "next";
import { responses } from "../../../config/strings";
import PurchaseModel, { Purchase } from "../../../models/Purchase";
import { error } from "../../../services/logger";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";

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

    const session = await auth(req, res);

    let user;
    if (session) {
        user = await User.findOne({
            email: session.user!.email,
            domain: domain._id,
            active: true,
        });
    }

    if (!user) {
        return res.status(401).json({});
    }
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
        error(err.message, { stack: err.stack });
        res.status(500).json({
            message: err.message,
        });
    }
}
