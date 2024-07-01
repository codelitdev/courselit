import CourseModel, { Course } from "../models/Course";
import UserModel, { User } from "../models/User";
import { triggerSequences } from "./trigger-sequences";
import { recordActivity } from "./record-activity";
import { Constants, Progress } from "@courselit/common-models";
import { sortCourseGroups } from "./utils";

function getAccessibleGroups(course: Course): string[] {
    const accessibleGroups: string[] = [];
    for (const group of sortCourseGroups(course)) {
        if (!group.drip || !group.drip?.status) {
            accessibleGroups.push(group.id);
        }
    }
    return accessibleGroups;
}

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
            accessibleGroups: getAccessibleGroups(course),
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
        }
    }
};
