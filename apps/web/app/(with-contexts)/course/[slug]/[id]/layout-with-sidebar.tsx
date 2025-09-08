"use client";

import { useContext } from "react";
import { isEnrolled, isLessonCompleted } from "@ui-lib/utils";
import { CheckCircled, Circle, Lock } from "@courselit/icons";
import { SIDEBAR_TEXT_COURSE_ABOUT } from "@ui-config/strings";
import { Profile, Constants } from "@courselit/common-models";
import {
    ComponentScaffoldMenuItem,
    ComponentScaffold,
    Divider,
} from "@components/public/scaffold";
import { ProfileContext, SiteInfoContext } from "@components/contexts";
import { CourseFrontend, GroupWithLessons } from "./helpers";

export default function ProductPage({
    product,
    children,
}: {
    product: CourseFrontend;
    children: React.ReactNode;
}) {
    const { profile } = useContext(ProfileContext);
    const siteInfo = useContext(SiteInfoContext);

    if (!profile) {
        return null;
    }

    return (
        <ComponentScaffold
            items={generateSideBarItems(product, profile as Profile)}
            drawerWidth={360}
            showCourseLitBranding={true}
            siteinfo={siteInfo}
        >
            {children}
        </ComponentScaffold>
    );
}

export function generateSideBarItems(
    course: CourseFrontend,
    profile: Profile,
): (ComponentScaffoldMenuItem | Divider)[] {
    if (!course) return [];

    const items: (ComponentScaffoldMenuItem | Divider)[] = [
        {
            label: SIDEBAR_TEXT_COURSE_ABOUT,
            href: `/course/${course.slug}/${course.courseId}`,
        },
    ];

    let lastGroupDripDateInMillis = Date.now();

    for (const group of course.groups) {
        let availableLabel = "";
        if (group.drip && group.drip.status) {
            if (
                group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase()
            ) {
                const delayInMillis =
                    group?.drip?.delayInMillis ?? 0 + lastGroupDripDateInMillis;
                const daysUntilAvailable = Math.ceil(
                    (delayInMillis - Date.now()) / 86400000,
                );
                availableLabel =
                    daysUntilAvailable &&
                    !isGroupAccessibleToUser(course, profile as Profile, group)
                        ? isEnrolled(course.courseId, profile)
                            ? `Available in ${daysUntilAvailable} days`
                            : `Available ${daysUntilAvailable} days after enrollment`
                        : "";
            } else {
                const today = new Date();
                const dripDate = new Date(group?.drip?.dateInUTC ?? "");
                const timeDiff = dripDate.getTime() - today.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

                availableLabel =
                    daysDiff > 0 &&
                    !isGroupAccessibleToUser(course, profile, group)
                        ? `Available in ${daysDiff} days`
                        : "";
            }
        }

        // Update lastGroupDripDateInMillis for relative drip types
        if (
            group.drip &&
            group.drip.status &&
            group.drip.type ===
                Constants.dripType[0].split("-")[0].toUpperCase()
        ) {
            lastGroupDripDateInMillis += group?.drip?.delayInMillis ?? 0;
        }

        items.push({
            badge: availableLabel,
            label: group.name,
        });

        for (const lesson of group.lessons) {
            items.push({
                label: lesson.title,
                href: `/course/${course.slug}/${course.courseId}/${lesson.lessonId}`,
                icon:
                    profile && profile.userId ? (
                        isEnrolled(course.courseId, profile) ? (
                            isLessonCompleted({
                                courseId: course.courseId,
                                lessonId: lesson.lessonId,
                                profile,
                            }) ? (
                                <CheckCircled />
                            ) : (
                                <Circle />
                            )
                        ) : lesson.requiresEnrollment ? (
                            <Lock />
                        ) : undefined
                    ) : lesson.requiresEnrollment ? (
                        <Lock />
                    ) : undefined,
                iconPlacementRight: true,
            });
        }
    }

    return items;
}

export function isGroupAccessibleToUser(
    course: CourseFrontend,
    profile: Profile,
    group: GroupWithLessons,
): boolean {
    if (!group.drip || !group.drip.status) return true;

    if (!Array.isArray(profile.purchases)) return false;

    for (const purchase of profile.purchases) {
        if (purchase.courseId === course.courseId) {
            if (Array.isArray(purchase.accessibleGroups)) {
                if (purchase.accessibleGroups.includes(group.id)) {
                    return true;
                }
            }
        }
    }

    return false;
}
