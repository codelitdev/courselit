"use client";

import DashboardContent from "@components/admin/dashboard-content";
import {
    MANAGE_PAGES_PAGE_HEADING,
    NEW_PAGE_HEADING,
} from "@ui-config/strings";
import dynamic from "next/dynamic";
const NewPage = dynamic(() => import("@components/admin/pages/new-page"));

const breadcrumbs = [
    { label: MANAGE_PAGES_PAGE_HEADING, href: "/dashboard/pages" },
    { label: NEW_PAGE_HEADING, href: "#" },
];

export default function Page() {
    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewPage />
        </DashboardContent>
    );
}
