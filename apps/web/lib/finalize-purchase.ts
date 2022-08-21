import CourseModel, { Course } from "../models/Course";
import { Progress } from "../models/Progress";
import UserModel, { User } from "../models/User";

export default async (userId: string, courseId: string) => {
    const user: User | null = await UserModel.findOne({ userId });
    const course: Course | null = await CourseModel.findOne({ courseId });

    if (
        user &&
        course &&
        !user.purchases.some(
            (purchase: Progress) => purchase.courseId === course.courseId
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
    }
};
