"use client";

import { AddressContext, ProfileContext } from "@components/contexts";
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
        href: `/dashboard4/communities`,
    },
    { label: NEW_COMMUNITY_BUTTON, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageSite]}
        >
            <CommunityCreator prefix="/dashboard4" address={address} />
        </DashboardContent>
    );
}
