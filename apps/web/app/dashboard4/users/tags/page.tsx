"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import Tags from "@components/admin/users/tags";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import {
    USERS_MANAGER_PAGE_HEADING,
    USERS_TAG_HEADER,
} from "@ui-config/strings";
import { useContext } from "react";

const { permissions } = UIConstants;

const breadcrumbs = [
    {
        label: USERS_MANAGER_PAGE_HEADING,
        href: "/dashboard4/users",
    },
    {
        label: USERS_TAG_HEADER,
        href: "#",
    },
];

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageUsers])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Tags address={address} prefix="/dashboard4" />
        </DashboardContent>
    );
}
