"use client";

import DashboardContent from "@components/admin/dashboard-content";
import SequenceEditor from "@components/admin/mails/sequence-editor";
import { AddressContext } from "@components/contexts";
import { PAGE_HEADER_EDIT_SEQUENCE, SEQUENCES } from "@ui-config/strings";
import { useContext } from "react";

const breadcrumbs = [
    { label: SEQUENCES, href: "/dashboard4/mails?tab=Sequences" },
    { label: PAGE_HEADER_EDIT_SEQUENCE, href: "#" },
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
            <SequenceEditor
                id={id as string}
                address={address}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
