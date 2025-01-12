"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import { ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { MANAGE_COMMUNITIES_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";
import List from "./list";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_COMMUNITIES_PAGE_HEADING, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageCommunity])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <List />
        </DashboardContent>
    );
}
