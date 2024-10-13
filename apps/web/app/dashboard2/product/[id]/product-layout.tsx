"use client";

import ProductEditorLayout from "@components/admin/products/editor/layout";
import { AddressContext } from "@components/contexts";
import { usePathname } from "next/navigation";
import { ReactNode, useContext } from "react";

export default function ProductLayout({
    id,
    children,
}: {
    id: string;
    children: ReactNode;
}) {
    const address = useContext(AddressContext);
    const path = usePathname();
    const isNewCustomerAdditionScreen = path?.indexOf("/customer/new") !== -1;

    return isNewCustomerAdditionScreen ? (
        children
    ) : (
        <ProductEditorLayout prefix="/dashboard2" address={address} id={id}>
            {children}
        </ProductEditorLayout>
    );
}
