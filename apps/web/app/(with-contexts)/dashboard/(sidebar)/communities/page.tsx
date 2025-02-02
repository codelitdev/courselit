"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { UIConstants } from "@courselit/common-models";
import { MANAGE_COMMUNITIES_PAGE_HEADING } from "@ui-config/strings";
import List from "./list";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COMMUNITIES_PAGE_HEADING, href: "#" }];

export default function Page() {
    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageCommunity]}
        >
            <List />
        </DashboardContent>
    );
}
