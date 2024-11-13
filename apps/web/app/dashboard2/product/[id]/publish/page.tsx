"use client";

import PublishingEditor from "@components/admin/products/editor/publish";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const { id } = params;

    return <PublishingEditor id={id as string} address={address} />;
}
