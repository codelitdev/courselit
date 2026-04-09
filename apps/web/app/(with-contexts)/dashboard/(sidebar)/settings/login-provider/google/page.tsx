"use client";

import { useContext } from "react";
import LoadingScreen from "@components/admin/loading-screen";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import {
    GOOGLE_PROVIDER_HEADER,
    SITE_MISCELLANEOUS_SETTING_HEADER,
    SITE_SETTINGS_PAGE_HEADING,
} from "@ui-config/strings";
import dynamic from "next/dynamic";

const { permissions } = UIConstants;
const GoogleProvider = dynamic(
    () => import("@/components/admin/settings/google"),
);

const breadcrumbs = [
    {
        label: SITE_SETTINGS_PAGE_HEADING,
        href: `/dashboard/settings?tab=${SITE_MISCELLANEOUS_SETTING_HEADER}`,
    },
    { label: GOOGLE_PROVIDER_HEADER, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageSettings]}
        >
            <GoogleProvider address={address} />
        </DashboardContent>
    );
}
