"use client";

import DashboardContent from "@components/admin/dashboard-content";
import SequenceMailEditor from "@components/admin/mails/sequence-mail-editor";
import { AddressContext } from "@components/contexts";
import {
    PAGE_HEADER_EDIT_MAIL,
    PAGE_HEADER_EDIT_SEQUENCE,
    SEQUENCES,
} from "@ui-config/strings";
import { useContext } from "react";

export default function Page({
    params,
}: {
    params: {
        id: string;
        mailId: string;
    };
}) {
    const address = useContext(AddressContext);
    const { id, mailId } = params;
    const breadcrumbs = [
        { label: SEQUENCES, href: "/dashboard4/mails?tab=Sequences" },
        {
            label: PAGE_HEADER_EDIT_SEQUENCE,
            href: `/dashboard4/mails/sequence/${id}`,
        },
        {
            label: PAGE_HEADER_EDIT_MAIL,
            href: "#",
        },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <SequenceMailEditor
                sequenceId={id as string}
                mailId={mailId as string}
                address={address}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
