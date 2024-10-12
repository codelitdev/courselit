"use client";

import SequenceEditor from "@components/admin/mails/sequence-editor";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

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
        <SequenceEditor
            id={id as string}
            address={address}
            prefix="/dashboard2"
        />
    );
}
