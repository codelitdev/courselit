"use client";

import Mails from "@components/admin/mails";
import { AddressContext, ProfileContext } from "@components/contexts";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";
import { UIConstants } from "@courselit/common-models";
import LoadingScreen from "@components/admin/loading-screen";
import DashboardContent from "@components/admin/dashboard-content";

const { permissions } = UIConstants;

export default function MailHub() {
    const address = useContext(AddressContext);
    const { profile } = useContext(ProfileContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Broadcasts";

    const breadcrumbs = [{ label: tab, href: "#" }];

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[permissions.manageUsers]}
        >
            <Mails selectedTab={tab as any} address={address} loading={false} />
        </DashboardContent>
    );
}
