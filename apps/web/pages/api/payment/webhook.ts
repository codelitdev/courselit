import mongoose from "mongoose";
import { NextApiRequest, NextApiResponse } from "next";
import nc from "next-connect";
import passport from "passport";
import constants from "../../../config/constants";
import connectDb from "../../../middlewares/connect-db";
import verifyDomain from "../../../middlewares/verify-domain";
import ApiRequest from "../../../models/ApiRequest";
import Course from "../../../models/Course";
import PurchaseModel, { Purchase } from "../../../models/Purchase";
import User from "../../../models/User";
import { getPaymentMethod } from "../../../payments";
const { transactionSuccess } = constants;

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
    .post(webhookHandler);

async function webhookHandler(req: ApiRequest, res: NextApiResponse) {
    const { body } = req;
    const paymentMethod = await getPaymentMethod(req.subdomain!._id.toString());
    const paymentVerified = paymentMethod.verify(body);
    if (paymentVerified) {
        const purchaseId = paymentMethod.getPaymentIdentifier(body);
        const purchaseRecord: Purchase | null = await PurchaseModel.findOne({
            orderId: purchaseId,
        });

        if (purchaseRecord) {
            purchaseRecord.status = transactionSuccess;
            await (purchaseRecord as any).save();

            await finalizeCoursePurchase(
                purchaseRecord.purchasedBy,
                purchaseRecord.courseId
            );

            res.status(200).json({
                message: "success",
            });
        } else {
            res.status(200).json({
                message: "fail",
            });
        }
    } else {
        res.status(200).json({
            message: "fail",
        });
    }
}

const finalizeCoursePurchase = async (
    userId: mongoose.Types.ObjectId,
    courseId: mongoose.Types.ObjectId
) => {
    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (user && course) {
        user.purchases.push(course.id);
        await user.save();
    }
};
