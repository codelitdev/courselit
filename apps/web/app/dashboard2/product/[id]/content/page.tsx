"use client";

import ContentEditor from "@components/admin/products/editor/content";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const { id } = params;

    return <ContentEditor id={id} address={address} prefix="/dashboard2" />;
}
