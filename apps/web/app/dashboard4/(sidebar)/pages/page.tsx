"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import { Pages } from "@components/admin/pages";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { MANAGE_PAGES_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_PAGES_PAGE_HEADING, href: "#" }];

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageSite])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Pages
                address={address}
                loading={false}
                dispatch={() => {}}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
