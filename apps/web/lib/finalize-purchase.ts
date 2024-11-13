import CourseModel, { Course } from "../models/Course";
import UserModel, { User } from "../models/User";
import PurchaseModel, { Purchase } from "@models/Purchase";
import DomainModel, { Domain } from "@models/Domain";
import { triggerSequences } from "./trigger-sequences";
import { recordActivity } from "./record-activity";
import { Constants, Progress } from "@courselit/common-models";
import saleEmailTemplate from "@/templates/sale-email";
import pug from "pug";
import { send } from "@/services/mail";
import { formattedLocaleDate } from "@ui-lib/utils";
import { error } from "@/services/logger";
import { responses } from "@/config/strings";

const finalizePurchase = async (
    userId: string,
    courseId: string,
    purchaseId?: string,
) => {
    const user: User | null = await UserModel.findOne({ userId });
    const course: Course | null = await CourseModel.findOne({ courseId });

    if (
        user &&
        course &&
        !user.purchases.some(
            (purchase: Progress) => purchase.courseId === course.courseId,
        )
    ) {
        user.purchases.push({
            courseId: course.courseId,
            completedLessons: [],
            accessibleGroups: [],
        });
        await (user as any).save();
        if (!course.customers.some((customer) => customer === user.userId)) {
            course.customers.push(user.userId);
            course.sales += course.cost;
            await (course as any).save();
        }
        await triggerSequences({
            user,
            event: Constants.eventTypes[2],
            data: course.courseId,
        });
        await recordActivity({
            domain: user.domain,
            userId: user.userId,
            type: "enrolled",
            entityId: course.courseId,
        });
        if (course.cost > 0) {
            await recordActivity({
                domain: user.domain,
                userId: user.userId,
                type: "purchased",
                entityId: course.courseId,
                metadata: {
                    cost: course.cost,
                    purchaseId,
                },
            });

            sendSaleNotificationToAdmins({
                user,
                course,
                purchaseId: purchaseId!,
            });
        }
    }
};

async function sendSaleNotificationToAdmins({
    user,
    course,
    purchaseId,
}: {
    user: User;
    course: Course;
    purchaseId: string;
}) {
    try {
        const domain: Domain | null = await DomainModel.findOne({
            _id: user.domain,
        });

        const purchase: Purchase | null = await PurchaseModel.findOne({
            orderId: purchaseId,
        });

        const usersWithManagePermissions = await UserModel.find(
            {
                domain: domain?._id,
                $or: [
                    { userId: course.creatorId, permissions: "course:manage" },
                    { permissions: "course:manage_any" },
                ],
            },
            { email: 1 },
        ).lean();

        const courseAdminsEmails = usersWithManagePermissions.map(
            (x) => x.email,
        );

        const emailBody = pug.render(saleEmailTemplate, {
            order: purchase?.orderId,
            courseName: course.title,
            coursePrice: course.cost,
            date: formattedLocaleDate(purchase!.purchasedOn),
            email: user?.email,
            hideCourseLitBranding: domain?.settings.hideCourseLitBranding,
        });

        await send({
            to: courseAdminsEmails,
            subject: responses.sales_made_subject,
            body: emailBody,
        });
    } catch (err) {
        error("Failed to send sale notification mail", err);
    }
}

export default finalizePurchase;
