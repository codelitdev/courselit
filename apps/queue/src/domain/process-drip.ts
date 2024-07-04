import CourseModel, { Course } from "./model/course";
import UserModel, { UserWithDomain as User } from "./model/user";
import mailQueue from "./queue";
import { Liquid } from "liquidjs";
const liquidEngine = new Liquid();

export async function processDrip() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of drips at ${new Date().toDateString()}`,
        );

        const courses: Course[] = await CourseModel.find({
            "groups.drip": { $exists: true },
        });
        const nowUTC = new Date().getTime();

        for (const course of courses) {
            const creator = await UserModel.findOne({
                userId: course.creatorId,
            });
            const exactDateAccessibleGroupIds = course.groups
                .filter(
                    (group) =>
                        group.drip &&
                        group.drip.status &&
                        group.drip.type === "exact-date" &&
                        nowUTC >= group.drip.dateInUTC,
                )
                .map((group) => group.id);

            const users: User[] = await UserModel.find({
                "purchases.courseId": course.courseId,
            });

            for (const user of users) {
                const userProgressInCourse = user.purchases.find(
                    (p) => p.courseId === course.courseId,
                );
                if (!userProgressInCourse) continue;

                const lastDripAtUTC = (
                    userProgressInCourse.lastDripAt ||
                    userProgressInCourse.createdAt
                ).getTime();
                const relativeAccessibleGroupIds = course.groups
                    .filter(
                        (group) =>
                            group.drip &&
                            group.drip.status &&
                            group.drip.type === "relative-date" &&
                            group.drip.delayInMillis >= 0 &&
                            nowUTC >= lastDripAtUTC + group.drip.delayInMillis,
                    )
                    .map((group) => group.id);

                const allAccessibleGroupIds = [
                    ...new Set([
                        ...exactDateAccessibleGroupIds,
                        ...relativeAccessibleGroupIds,
                    ]),
                ];
                const newGroupIds = allAccessibleGroupIds.filter(
                    (id) => !userProgressInCourse.accessibleGroups.includes(id),
                );

                if (newGroupIds.length > 0) {
                    await UserModel.updateOne(
                        {
                            userId: user.userId,
                            "purchases.courseId": course.courseId,
                        },
                        {
                            $addToSet: {
                                "purchases.$.accessibleGroups": {
                                    $each: newGroupIds,
                                },
                            },
                            $set: {
                                "purchases.$.lastDripAt": new Date(nowUTC),
                            },
                        },
                    );

                    const firstGroupWithDripEmailSet = course.groups.find(
                        (group) => group.id === newGroupIds[0],
                    );

                    if (firstGroupWithDripEmailSet) {
                        const templatePayload = {
                            subscriber: {
                                email: user.email,
                                name: user.name,
                                tags: user.tags,
                            },
                        };
                        const content = await liquidEngine.parseAndRender(
                            firstGroupWithDripEmailSet.drip.email.content,
                            templatePayload,
                        );
                        await mailQueue.add("mail", {
                            to: user.email,
                            subject:
                                firstGroupWithDripEmailSet.drip.email.subject,
                            body: content,
                            from: `${creator.name || creator.email} <${
                                creator.email
                            }>`,
                        });
                    }
                }
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}
