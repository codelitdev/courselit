"use client";

import BroadcastEditor from "@components/admin/mails/broadcast-editor";
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
        <BroadcastEditor
            id={id as string}
            address={address}
            prefix="/dashboard2"
        />
    );
}
