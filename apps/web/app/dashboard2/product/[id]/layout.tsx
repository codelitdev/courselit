"use client";

import ProductEditorLayout from "@components/admin/products/editor/layout";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { ReactNode, useContext } from "react";
const { permissions } = UIConstants;

export default function Page({
    params,
    children,
}: {
    params: { id: string };
    children: ReactNode;
}) {
    const address = useContext(AddressContext);
    const { id } = params;
    const profile = useContext(ProfileContext);

    return (
        <ProductEditorLayout prefix="/dashboard2" address={address} id={id}>
            {children}
        </ProductEditorLayout>
    );
}
