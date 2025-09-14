"use client";

import DashboardContent from "@components/admin/dashboard-content";
import NewCustomer from "@components/admin/products/new-customer";
import { AddressContext } from "@components/contexts";
import {
    MANAGE_COURSES_PAGE_HEADING,
    PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER,
} from "@ui-config/strings";
import { truncate } from "@ui-lib/utils";
import { useContext } from "react";
import useProduct from "@/hooks/use-product";
import { useParams } from "next/navigation";

export default function Page() {
    const params = useParams();
    const productId = params?.id as string;
    const address = useContext(AddressContext);
    const { product } = useProduct(productId);
    const breadcrumbs = [
        { label: MANAGE_COURSES_PAGE_HEADING, href: "/dashboard/products" },
        {
            label: product ? truncate(product.title || "", 20) || "..." : "...",
            href: `/dashboard/product/${product?.courseId}`,
        },
        { label: PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER, href: "#" },
    ];

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewCustomer
                courseId={product?.courseId as string}
                address={address}
            />
        </DashboardContent>
    );
}
