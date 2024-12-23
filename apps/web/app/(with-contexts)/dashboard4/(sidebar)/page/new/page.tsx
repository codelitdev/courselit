"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import {
    MANAGE_PAGES_PAGE_HEADING,
    NEW_PAGE_HEADING,
} from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useContext } from "react";
const NewPage = dynamic(() => import("@components/admin/pages/new-page"));

const breadcrumbs = [
    { label: MANAGE_PAGES_PAGE_HEADING, href: "/dashboard4/pages" },
    { label: NEW_PAGE_HEADING, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewPage address={address} prefix="/dashboard4" />
        </DashboardContent>
    );
}
