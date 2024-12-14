"use client";

import { AddressContext, ProfileContext } from "@components/contexts";
import { checkPermission } from "@courselit/utils";
import {
    NEW_COMMUNITY_BUTTON,
    SITE_SETTINGS_PAGE_HEADING,
    SITE_SETTINGS_SECTION_COMMUNITIES,
} from "@ui-config/strings";
import { useContext } from "react";
import { UIConstants } from "@courselit/common-models";
import LoadingScreen from "@components/admin/loading-screen";
import DashboardContent from "@components/admin/dashboard-content";
import CommunityCreator from "@components/community/creator";
const { permissions } = UIConstants;

const breadcrumbs = [
    {
        label: SITE_SETTINGS_PAGE_HEADING,
        href: `/dashboard4/settings?tab=${SITE_SETTINGS_SECTION_COMMUNITIES}`,
    },
    { label: NEW_COMMUNITY_BUTTON, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageSettings])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <CommunityCreator prefix="/dashboard4" address={address} />
        </DashboardContent>
    );
}
