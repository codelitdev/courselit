"use client";

import { useContext } from "react";
import LoadingScreen from "@components/admin/loading-screen";
import { checkPermission } from "@courselit/utils";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import {
    SITE_MISCELLANEOUS_SETTING_HEADER,
    SITE_SETTINGS_PAGE_HEADING,
    SSO_PROVIDER_NEW_HEADER,
} from "@ui-config/strings";
import dynamic from "next/dynamic";
const { permissions } = UIConstants;

const SSOProviderNew = dynamic(
    () => import("@/components/admin/settings/sso/new"),
);

const breadcrumbs = [
    {
        label: SITE_SETTINGS_PAGE_HEADING,
        href: `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`,
    },
    { label: SSO_PROVIDER_NEW_HEADER, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);

    if (
        !profile ||
        !checkPermission(profile.permissions!, [permissions.manageSettings])
    ) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <SSOProviderNew address={address} />
        </DashboardContent>
    );
}
