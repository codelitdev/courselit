"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import Settings from "@components/admin/settings";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { Profile, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { SITE_SETTINGS_PAGE_HEADING } from "@ui-config/strings";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: SITE_SETTINGS_PAGE_HEADING, href: "#" }];

export default function Page() {
    const siteinfo = useContext(SiteInfoContext);
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Branding";

    if (!checkPermission(profile.permissions!, [permissions.manageSettings])) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Settings
                key={tab}
                siteinfo={siteinfo}
                address={address}
                profile={profile as Profile}
                selectedTab={tab as any}
                dispatch={() => {}}
                loading={false}
                networkAction={false}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
