"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import { ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { MANAGE_PAGES_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
import { useContext } from "react";
const { permissions } = UIConstants;

const Pages = dynamic(() => import("@components/admin/pages"));

const breadcrumbs = [{ label: MANAGE_PAGES_PAGE_HEADING, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageSite]}
        >
            <Pages />
        </DashboardContent>
    );
}
