"use client";

import DashboardContent from "@components/admin/dashboard-content";
import useCourse from "@components/admin/products/editor/course-hook";
import SectionEditor from "@components/admin/products/editor/section";
import { AddressContext } from "@components/contexts";
import {
    EDIT_SECTION_HEADER,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import { useContext } from "react";

export default function Page({
    params,
}: {
    params: { id: string; section: string };
}) {
    const address = useContext(AddressContext);
    const { id, section } = params;
    const course = useCourse(id, address);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard4/products" },
        {
            label: course ? truncate(course.title || "", 20) || "..." : "...",
            href: `/dashboard4/product/${id}?tab=Content`,
        },
        {
            label: EDIT_SECTION_HEADER,
            href: "#",
        },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <SectionEditor
                id={id as string}
                section={section as string}
                address={address}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
