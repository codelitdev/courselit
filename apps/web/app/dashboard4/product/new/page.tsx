"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { NewProduct } from "@components/admin/products/new-product";
import { AddressContext } from "@components/contexts";
import {
    BTN_NEW_PRODUCT,
    MANAGE_COURSES_PAGE_HEADING,
} from "@ui-config/strings";
import { useContext } from "react";

const breadcrumbs = [
    { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard4/products" },
    { label: BTN_NEW_PRODUCT, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewProduct
                address={address}
                networkAction={false}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
