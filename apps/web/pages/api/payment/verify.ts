import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import passport from "passport";
import { responses } from "../../../config/strings";
import jwtStrategy from "../../../lib/jwt";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import verifyJwt from "../../../middlewares/verify-jwt";
import ApiRequest from "../../../models/ApiRequest";
import PurchaseModel, { Purchase } from "../../../models/Purchase";
import { User } from "../../../models/User";

passport.use(jwtStrategy);

export default nc<NextApiRequest, NextApiResponse>({
    onError: (err, req, res, next) => {
        res.status(500).json({ error: err.message });
    },
    onNoMatch: (req, res) => {
        res.status(404).end("Not found");
    },
    attachParams: true,
})
    .use(passport.initialize())
    .use(connectDb)
    .use(verifyDomain)
    .use(verifyJwt(passport))
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

        if (
            !purchaseRecord ||
            !isSelf({
                loggedInUser: user!,
                buyerId: purchaseRecord.purchasedBy,
            })
        ) {
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

const isSelf = ({
    loggedInUser,
    buyerId,
}: {
    loggedInUser: User;
    buyerId: mongoose.Types.ObjectId;
}) => loggedInUser.id.toString() === buyerId.toString();
