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

        // Prepare the metadata with the required information
        const metadataObj = JSON.parse(metadata);
        const invoiceId = purchase.orderId;

        console.log("Payment method:", paymentMethod.getName());
        
        let paymentTracker;
        
        if (paymentMethod.getName() === 'mercadopago') {
            // For Mercado Pago, we need to pass the parameters in the format expected by MercadoPagoPayment
            paymentTracker = await paymentMethod.initiate({
                metadata: {
                    invoiceId,
                    ...metadataObj
                },
                paymentPlan: {
                    type: "onetime", 
                    oneTimeAmount: course.cost
                },
                // Use type assertion for the entire product object to handle type compatibility
                product: {
                    id: course.courseId,
                    title: course.title,
                    type: (course.type || "course") as any,
                    cost: course.cost
                } as any,
                origin: metadataObj.cancelUrl?.split('/checkout')[0] || ''
            });
        } else {
            // For other payment methods, use the existing format
            paymentTracker = await paymentMethod.initiate({
                course,
                metadata: metadataObj,
                purchaseId: invoiceId,
            });
        }

        purchase.paymentId = typeof paymentTracker === 'object' && paymentTracker.id 
            ? paymentTracker.id 
            : paymentTracker;
        await purchase.save();

        // If Mercado Pago returns a URL, use it for redirection
        if (typeof paymentTracker === 'object' && paymentTracker.url) {
            res.status(200).json({
                status: transactionInitiated,
                paymentTracker: purchase.paymentId,
                paymentUrl: paymentTracker.url
            });
        } else {
            res.status(200).json({
                status: transactionInitiated,
                paymentTracker: purchase.paymentId
            });
        }
    } catch (err: any) {
        error(err.message, { stack: err.stack });
        res.status(500).json({
            status: transactionFailed,
            error: err.message,
        });
    }
}
