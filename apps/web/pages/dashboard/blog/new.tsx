import React from "react";
import { PAGE_HEADER_NEW_BLOG } from "../../../ui-config/strings";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(
    () => import("../../../components/admin/base-layout"),
);

const NewBlog = dynamic(
    () => import("../../../components/admin/blogs/new-blog"),
);

export default function New() {
    return (
        <BaseLayout title={PAGE_HEADER_NEW_BLOG}>
            <NewBlog prefix="/dashboard" />
        </BaseLayout>
    );
}
