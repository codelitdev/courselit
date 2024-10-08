"use client";

import ProductEditorLayout from "@components/admin/products/editor/layout";
import { AddressContext } from "@components/contexts";
import { ReactNode, useContext } from "react";

export default function ProductLayout({
    id,
    children,
}: {
    id: string;
    children: ReactNode;
}) {
    const address = useContext(AddressContext);

    return (
        <ProductEditorLayout prefix="/dashboard2" address={address} id={id}>
            {children}
        </ProductEditorLayout>
    );
}
