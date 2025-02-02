"use client";

import { AddressContext } from "@components/contexts";
import {
    MANAGE_COMMUNITIES_PAGE_HEADING,
    NEW_COMMUNITY_BUTTON,
} from "@ui-config/strings";
import { useContext } from "react";
import { UIConstants } from "@courselit/common-models";
import DashboardContent from "@components/admin/dashboard-content";
import CommunityCreator from "@components/community/creator";
const { permissions } = UIConstants;

const breadcrumbs = [
    {
        label: MANAGE_COMMUNITIES_PAGE_HEADING,
        href: `/dashboard/communities`,
    },
    { label: NEW_COMMUNITY_BUTTON, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageCommunity]}
        >
            <CommunityCreator address={address} />
        </DashboardContent>
    );
}
