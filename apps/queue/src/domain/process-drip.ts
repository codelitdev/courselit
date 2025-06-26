import CourseModel, { Course } from "./model/course";
import UserModel from "./model/user";
import mailQueue from "./queue";
import { Liquid } from "liquidjs";
import { getMemberships } from "./queries";
import { Constants } from "@courselit/common-models";
import { InternalUser } from "@courselit/common-logic";
import { FilterQuery, UpdateQuery } from "mongoose";
import { renderEmailToHtml } from "@courselit/email-editor";
const liquidEngine = new Liquid();

export async function processDrip() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        // eslint-disable-next-line no-console
        console.log(
            `Starting process of drips at ${new Date().toDateString()}`,
        );

        const courseQuery: FilterQuery<Course> = {
            "groups.drip": { $exists: true },
        };
        // @ts-ignore - Mongoose type compatibility issue
        const courses = (await CourseModel.find(
            courseQuery,
        ).lean()) as unknown as Course[];

        const nowUTC = new Date().getTime();

        for (const course of courses) {
            const creatorQuery: FilterQuery<InternalUser> = {
                userId: course.creatorId,
            };
            // @ts-ignore - Mongoose type compatibility issue
            const creator = (await UserModel.findOne(
                creatorQuery,
            ).lean()) as unknown as InternalUser | null;

            const exactDateAccessibleGroupIds = course.groups
                .filter(
                    (group) =>
                        group.drip &&
                        group.drip.status &&
                        group.drip.type === "exact-date" &&
                        nowUTC >= group.drip.dateInUTC,
                )
                .map((group) => group.id);

            const memberships = await getMemberships(
                course.courseId,
                Constants.MembershipEntityType.COURSE,
            );
            const userQuery: FilterQuery<InternalUser> = {
                domain: course.domain,
                userId: { $in: memberships.map((m) => m.userId) },
            };
            // @ts-ignore - Mongoose type compatibility issue
            const users = (await UserModel.find(
                userQuery,
            ).lean()) as unknown as InternalUser[];

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
                    const updateQuery: FilterQuery<InternalUser> = {
                        userId: user.userId,
                        "purchases.courseId": course.courseId,
                    };
                    const updateData: UpdateQuery<InternalUser> = {
                        $addToSet: {
                            "purchases.$.accessibleGroups": {
                                $each: newGroupIds,
                            },
                        },
                        $set: {
                            "purchases.$.lastDripAt": new Date(nowUTC),
                        },
                    };
                    // @ts-ignore - Mongoose type compatibility issue
                    await UserModel.updateOne(updateQuery, updateData);

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
                        if (firstGroupWithDripEmailSet.drip?.email?.content) {
                            const content = await liquidEngine.parseAndRender(
                                await renderEmailToHtml({
                                    email: firstGroupWithDripEmailSet.drip.email
                                        .content,
                                }),
                                templatePayload,
                            );
                            await mailQueue.add("mail", {
                                to: user.email,
                                subject:
                                    firstGroupWithDripEmailSet.drip.email
                                        .subject,
                                body: content,
                                from: `${creator?.name || creator?.email} <${
                                    creator?.email
                                }>`,
                            });
                        }
                    }
                }
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}
