import { NextApiRequest, NextApiResponse } from "next";
import constants from "../../../config/constants";
import { responses } from "../../../config/strings";
import CourseModel, { Course } from "../../../models/Course";
import { getPaymentMethod } from "../../../payments";
import PurchaseModel from "../../../models/Purchase";
import finalizePurchase from "../../../lib/finalize-purchase";
import { error } from "../../../services/logger";
import User from "@models/User";
import DomainModel, { Domain } from "@models/Domain";
import { auth } from "@/auth";

const { transactionSuccess, transactionFailed, transactionInitiated } =
    constants;

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

    const { body } = req;
    const { courseid, metadata } = body;

    if (!courseid) {
        return res.status(400).json({ error: responses.invalid_course_id });
    }

    try {
        const course: Course | null = await CourseModel.findOne({
            courseId: courseid,
            domain: domain._id,
        });
        if (!course) {
            return res.status(404).json({ error: responses.item_not_found });
        }

        const buyer = user!;
        if (
            buyer.purchases.some(
                (purchase) => purchase.courseId === course.courseId,
            )
        ) {
            return res.status(200).json({
                status: transactionSuccess,
            });
        }

        if (course.cost === 0) {
            try {
                await finalizePurchase(user!.userId, course!.courseId);
                return res.status(200).json({
                    status: transactionSuccess,
                });
            } catch (err: any) {
                return res.status(500).json({ error: err.message });
            }
        }

        const siteinfo = domain.settings;
        const paymentMethod = await getPaymentMethod(domain!._id.toString());

        const purchase = await PurchaseModel.create({
            domain: domain._id.toString(),
            courseId: course.courseId,
            purchasedBy: user!.userId,
            paymentMethod: paymentMethod.getName(),
            amount: course.cost * 100,
            currencyISOCode: siteinfo.currencyISOCode,
        });

        const paymentTracker = await paymentMethod.initiate({
            course,
            metadata: JSON.parse(metadata),
            purchaseId: purchase.orderId,
        });

        purchase.paymentId = paymentTracker;
        await purchase.save();

        res.status(200).json({
            status: transactionInitiated,
            paymentTracker,
        });
    } catch (err: any) {
        error(err.message, { stack: err.stack });
        res.status(500).json({
            status: transactionFailed,
            error: err.message,
        });
    }
}
