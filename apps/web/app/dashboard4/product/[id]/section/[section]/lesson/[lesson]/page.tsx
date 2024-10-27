"use client";

import LessonEditor from "@/components/admin/products/editor/content/lesson";
import DashboardContent from "@components/admin/dashboard-content";
import useCourse from "@components/admin/products/editor/course-hook";
import { AddressContext, ProfileContext } from "@components/contexts";
import {
    EDIT_LESSON_TEXT,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import { useContext } from "react";

export default function Page({
    params,
}: {
    params: { id: string; section: string; lesson: string };
}) {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const { id, section, lesson } = params;
    const course = useCourse(id, address);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard4/products" },
        {
            label: course ? truncate(course.title || "", 20) || "..." : "...",
            href: `/dashboard4/product/${id}?tab=Content`,
        },
        { label: EDIT_LESSON_TEXT, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <LessonEditor
                courseId={id as string}
                sectionId={section as string}
                lessonId={lesson}
                address={address}
                profile={profile as Profile}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
