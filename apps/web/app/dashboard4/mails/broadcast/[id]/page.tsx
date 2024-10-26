"use client";

import DashboardContent from "@components/admin/dashboard-content";
import BroadcastEditor from "@components/admin/mails/broadcast-editor";
import { AddressContext } from "@components/contexts";
import { BROADCASTS, PAGE_HEADER_EDIT_MAIL } from "@ui-config/strings";
import { useContext } from "react";

const breadcrumbs = [
    { label: BROADCASTS, href: "/dashboard4/mails?tab=Broadcasts" },
    { label: PAGE_HEADER_EDIT_MAIL, href: "#" },
];

export default function Page({
    params,
}: {
    params: {
        id: string;
    };
}) {
    const address = useContext(AddressContext);
    const { id } = params;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <BroadcastEditor
                id={id as string}
                address={address}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
