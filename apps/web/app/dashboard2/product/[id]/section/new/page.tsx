"use client";

import SectionEditor from "@components/admin/products/editor/section";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const { id } = params;

    return (
        <SectionEditor
            id={id as string}
            address={address}
            prefix="/dashboard2"
        />
    );
}
