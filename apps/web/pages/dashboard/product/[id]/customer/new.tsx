"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER } from "@ui-config/strings";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

const NewCustomer = dynamic(
    () => import("@components/admin/products/new-customer"),
);

export default function New() {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}>
            <NewCustomer courseId={id as string} />
        </BaseLayout>
    );
}
