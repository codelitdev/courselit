import CourseModel from "./model/course";
import UserModel from "./model/user";
import { Liquid } from "liquidjs";
import { getDomain, getMemberships } from "./queries";
import { Constants } from "@courselit/common-models";
import { InternalCourse, InternalUser } from "@courselit/orm-models";
import { getEmailFrom } from "@courselit/utils";
import { FilterQuery, UpdateQuery } from "mongoose";
import { renderEmailToHtml } from "@courselit/email-editor";
import { getSiteUrl } from "../utils/get-site-url";
import { getUnsubLink } from "../utils/get-unsub-link";
import { captureError, getDomainId } from "../observability/posthog";
import { addMailJob } from "./handler";
import { logInfo } from "@/observability/logs";
const liquidEngine = new Liquid();

type CourseGroup = InternalCourse["groups"][number];
type UserPurchase = InternalUser["purchases"][number];

function toGroupId(group: CourseGroup): string | undefined {
    const value = (group as { _id?: unknown; id?: unknown })._id ?? group.id;
    if (value === null || value === undefined) {
        return undefined;
    }

    return String(value);
}

function getSortedGroups(groups: CourseGroup[] = []): CourseGroup[] {
    return [...groups].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
}

/**
 * Answers: given this course, this user’s progress, and current time, which section
 * group IDs should be newly unlocked right now?
 */
export function getNewAccessibleGroupIdsForPurchase({
    course,
    userProgressInCourse,
    nowUTC,
}: {
    course: InternalCourse;
    userProgressInCourse: UserPurchase;
    nowUTC: number;
}): string[] {
    const accessibleGroups = Array.isArray(
        userProgressInCourse.accessibleGroups,
    )
        ? userProgressInCourse.accessibleGroups
        : [];
    const sortedGroups = getSortedGroups(course.groups ?? []);

    const exactDateAccessibleGroupIds = sortedGroups
        .filter((group) => {
            const releaseDateInUTC = group.drip?.dateInUTC;
            return (
                group.drip?.status &&
                group.drip.type === "exact-date" &&
                typeof releaseDateInUTC === "number" &&
                nowUTC >= releaseDateInUTC
            );
        })
        .map(toGroupId)
        .filter((id): id is string => Boolean(id));

    const progressAnchor = userProgressInCourse.lastDripAt
        ? new Date(userProgressInCourse.lastDripAt)
        : userProgressInCourse.createdAt
          ? new Date(userProgressInCourse.createdAt)
          : null;
    if (!progressAnchor) {
        return exactDateAccessibleGroupIds.filter(
            (id) => !accessibleGroups.includes(id),
        );
    }

    const anchorInUTC = progressAnchor.getTime();
    if (Number.isNaN(anchorInUTC)) {
        return exactDateAccessibleGroupIds.filter(
            (id) => !accessibleGroups.includes(id),
        );
    }

    const relativeAccessibleGroupIds: string[] = [];
    let releaseCursorUTC = anchorInUTC;
    for (const group of sortedGroups) {
        if (
            !group.drip?.status ||
            group.drip.type !== "relative-date" ||
            !Number.isFinite(group.drip.delayInMillis)
        ) {
            continue;
        }

        const groupId = toGroupId(group);
        if (!groupId || accessibleGroups.includes(groupId)) {
            continue;
        }

        const delayInMillis = group.drip.delayInMillis as number;
        if (delayInMillis < 0) {
            break;
        }

        const unlockAtUTC = releaseCursorUTC + delayInMillis;
        if (nowUTC >= unlockAtUTC) {
            relativeAccessibleGroupIds.push(groupId);
            releaseCursorUTC = unlockAtUTC;
            continue;
        }

        // Relative drips are sequential by section order.
        break;
    }

    const allAccessibleGroupIds = new Set([
        ...exactDateAccessibleGroupIds,
        ...relativeAccessibleGroupIds,
    ]);
    return [...allAccessibleGroupIds].filter(
        (id) => !accessibleGroups.includes(id),
    );
}

export async function processDrip() {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            // eslint-disable-next-line no-console
            console.log(
                `Starting process of drips at ${new Date().toDateString()}`,
            );

            const courseQuery: FilterQuery<InternalCourse> = {
                "groups.drip": { $exists: true },
            };
            // @ts-ignore - Mongoose type compatibility issue
            const courses = (await CourseModel.find(
                courseQuery,
            ).lean()) as unknown as InternalCourse[];

            const nowUTC = new Date().getTime();

            for (const course of courses) {
                try {
                    const creatorQuery: FilterQuery<InternalUser> = {
                        userId: course.creatorId,
                    };
                    // @ts-ignore - Mongoose type compatibility issue
                    const creator = (await UserModel.findOne(
                        creatorQuery,
                    ).lean()) as unknown as InternalUser | null;

                    const memberships = await getMemberships(
                        course.courseId,
                        Constants.MembershipEntityType.COURSE,
                        course.domain,
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

                        const newGroupIds = getNewAccessibleGroupIdsForPurchase(
                            {
                                course,
                                userProgressInCourse,
                                nowUTC,
                            },
                        );

                        if (newGroupIds.length > 0) {
                            const newlyUnlockedGroups = newGroupIds
                                .map((groupId) =>
                                    course.groups.find(
                                        (group) =>
                                            toGroupId(group as CourseGroup) ===
                                            groupId,
                                    ),
                                )
                                .filter((group): group is CourseGroup =>
                                    Boolean(group),
                                );

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
                            };
                            if (
                                newlyUnlockedGroups.some(
                                    (group) =>
                                        group.drip?.status &&
                                        group.drip.type === "relative-date",
                                )
                            ) {
                                updateData.$set = {
                                    "purchases.$.lastDripAt": new Date(nowUTC),
                                };
                            }
                            // @ts-ignore - Mongoose type compatibility issue
                            await UserModel.updateOne(updateQuery, updateData);

                            logInfo(
                                `${newGroupIds.length} Sections unlocked for ${user.email} in course ${course.title}`,
                                {
                                    source: "processDrip.unlock",
                                    domainId: getDomainId(course.domain),
                                    course_id: course.courseId,
                                    user_id: user.userId,
                                    unlocked_group_ids: newGroupIds.join(","),
                                },
                            );

                            const newlyUnlockedGroupsWithDripEmail =
                                newlyUnlockedGroups.filter(
                                    (group) =>
                                        Boolean(group.drip?.email?.content) &&
                                        Boolean(group.drip?.email?.subject),
                                );

                            if (newlyUnlockedGroupsWithDripEmail.length > 0) {
                                const domain = await getDomain(course.domain);
                                const templatePayload = {
                                    subscriber: {
                                        email: user.email,
                                        name: user.name,
                                        tags: user.tags,
                                    },
                                    product: {
                                        title: course.title,
                                        url: `${getSiteUrl(domain)}/course/${course.slug}/${course.courseId}`,
                                    },
                                    address: domain.settings.mailingAddress,
                                    unsubscribe_link: getUnsubLink(
                                        domain,
                                        user.unsubscribeToken,
                                    ),
                                };
                                for (const group of newlyUnlockedGroupsWithDripEmail) {
                                    const dripEmail = group.drip?.email;
                                    if (
                                        !dripEmail?.content ||
                                        !dripEmail.subject
                                    ) {
                                        continue;
                                    }

                                    const content =
                                        await liquidEngine.parseAndRender(
                                            await renderEmailToHtml({
                                                email: dripEmail.content,
                                            }),
                                            templatePayload,
                                        );
                                    await addMailJob({
                                        to: [user.email],
                                        subject: dripEmail.subject,
                                        body: content,
                                        from: getEmailFrom({
                                            name:
                                                creator?.name ||
                                                creator?.email ||
                                                "",
                                            email: process.env.EMAIL_FROM || "",
                                        }),
                                        domainId: getDomainId(course.domain),
                                    });
                                }
                            }
                        }
                    }
                } catch (err: any) {
                    captureError({
                        error: err,
                        source: "processDrip.course",
                        domainId: getDomainId(course.domain),
                        context: {
                            course_id: course.courseId,
                        },
                    });
                }
            }
        } catch (err: any) {
            captureError({
                error: err,
                source: "processDrip.loop",
                domainId: getDomainId(),
            });
        }

        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
}
