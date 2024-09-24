"use client";

import { Settings } from "@components/admin/settings";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { Profile, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect, useSearchParams } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

export default function Page() {
    const siteinfo = useContext(SiteInfoContext);
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Branding";

    if (!checkPermission(profile.permissions!, [permissions.manageSettings])) {
        redirect("/dashboard2");
    }

    return (
        <Settings
            key={tab}
            siteinfo={siteinfo}
            address={address}
            profile={profile as Profile}
            selectedTab={tab as any}
            dispatch={() => {}}
            loading={false}
            networkAction={false}
        />
    );
}
