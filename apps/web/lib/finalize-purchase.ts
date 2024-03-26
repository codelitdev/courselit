import CourseModel, { Course } from "../models/Course";
import { Progress } from "../models/Progress";
import UserModel, { User } from "../models/User";
import { recordActivity } from "./record-activity";

export default async (
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
        });
        await (user as any).save();
        if (!course.customers.some((customer) => customer === user.userId)) {
            course.customers.push(user.userId);
            course.sales += course.cost;
            await (course as any).save();
        }
        await recordActivity({
            domain: user.domain,
            userId: user.userId,
            type: "enrolled",
            entityId: course.courseId,
            metadata: {
                cost: course.cost,
                purchaseId,
            },
        });
    }
};
