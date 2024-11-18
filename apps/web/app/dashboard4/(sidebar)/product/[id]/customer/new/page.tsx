"use client";

import DashboardContent from "@components/admin/dashboard-content";
import useCourse from "@components/admin/products/editor/course-hook";
import NewCustomer from "@components/admin/products/new-customer";
import { AddressContext } from "@components/contexts";
import {
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const address = useContext(AddressContext);
    const course = useCourse(id, address);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard4/products" },
        {
            label: course ? truncate(course.title || "", 20) || "..." : "...",
            href: `/dashboard4/product/${id}?tab=Content`,
        },
        { label: PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewCustomer
                courseId={id as string}
                prefix="/dashboard4"
                address={address}
            />
        </DashboardContent>
    );
}
