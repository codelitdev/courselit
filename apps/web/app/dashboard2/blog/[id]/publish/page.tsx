"use client";

import { Publish } from "@components/admin/blogs/editor/publish";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const { id } = params;

    return <Publish id={id} address={address} loading={false} />;
}
