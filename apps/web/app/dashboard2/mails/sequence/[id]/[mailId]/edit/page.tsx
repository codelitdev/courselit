"use client";

import SequenceMailEditor from "@components/admin/mails/sequence-mail-editor";
import { AddressContext } from "@components/contexts";
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

    return (
        <SequenceMailEditor
            sequenceId={id as string}
            mailId={mailId as string}
            address={address}
            prefix="/dashboard2"
        />
    );
}
