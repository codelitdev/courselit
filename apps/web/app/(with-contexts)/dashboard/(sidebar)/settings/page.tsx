"use client";

import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import Settings from "@components/admin/settings";
import { ProfileContext, SiteInfoContext } from "@components/contexts";
import { Profile, UIConstants } from "@courselit/common-models";
import { SITE_SETTINGS_PAGE_HEADING } from "@ui-config/strings";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: SITE_SETTINGS_PAGE_HEADING, href: "#" }];

export default function Page() {
    const siteinfo = useContext(SiteInfoContext);
    const { profile } = useContext(ProfileContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Branding";

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageSettings]}
        >
            <Settings
                key={tab}
                siteinfo={siteinfo}
                profile={profile as Profile}
                selectedTab={tab as any}
            />
        </DashboardContent>
    );
}
