import React from "react";
import { PAGE_HEADER_NEW_PRODUCT } from "../../../ui-config/strings";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);

const NewProduct = dynamic(
    () => import("../../../components/admin/products/new-product"),
);

export default function New() {
    return (
        <BaseLayout title={PAGE_HEADER_NEW_PRODUCT}>
            <NewProduct prefix="/dashboard" />
        </BaseLayout>
    );
}
