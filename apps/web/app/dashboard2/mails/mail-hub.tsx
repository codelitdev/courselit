"use client";

import Mails from "@components/admin/mails";
import { AddressContext, ProfileContext } from "@components/contexts";
import { checkPermission } from "@courselit/utils";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { UIConstants } from "@courselit/common-models";
import LoadingScreen from "@components/admin/loading-screen";

const { permissions } = UIConstants;

export default function MailHub() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Broadcasts";

    if (!checkPermission(profile.permissions!, [permissions.manageSite])) {
        return <LoadingScreen />;
    }

    return (
        <Mails
            selectedTab={tab as any}
            address={address}
            prefix="/dashboard2"
            loading={false}
        />
    );
}
