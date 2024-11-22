"use client";

import { useContext } from "react";
import LoadingScreen from "@components/admin/loading-screen";
import { checkPermission } from "@courselit/utils";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import { SITE_SETTINGS_PAGE_HEADING } from "@ui-config/strings";
import dynamic from "next/dynamic";
const { permissions } = UIConstants;

const ApikeyNew = dynamic(
    () => import("@/components/admin/settings/apikey/new"),
);

const breadcrumbs = [{ label: SITE_SETTINGS_PAGE_HEADING, href: "#" }];

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageSettings])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <ApikeyNew prefix="/dashboard4" address={address} />
        </DashboardContent>
    );
}
