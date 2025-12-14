"use client";

import { useContext } from "react";
import LoadingScreen from "@components/admin/loading-screen";
import { checkPermission } from "@courselit/utils";
import {
    AddressContext,
    FeaturesContext,
    ProfileContext,
} from "@components/contexts";
import { Constants, UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import {
    SITE_MISCELLANEOUS_SETTING_HEADER,
    SITE_SETTINGS_PAGE_HEADING,
    SSO_PROVIDER_HEADER,
} from "@ui-config/strings";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";
const { permissions } = UIConstants;

const SSOProvider = dynamic(() => import("@/components/admin/settings/sso"));

const breadcrumbs = [
    {
        label: SITE_SETTINGS_PAGE_HEADING,
        href: `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`,
    },
    { label: SSO_PROVIDER_HEADER, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const features = useContext(FeaturesContext);

    if (!features.includes(Constants.Features.SSO)) {
        redirect(
            `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`,
        );
    }

    if (
        !profile ||
        !checkPermission(profile.permissions!, [permissions.manageSettings])
    ) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <SSOProvider address={address} />
        </DashboardContent>
    );
}
