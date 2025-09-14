"use client";

import NewBlog from "@components/admin/blogs/new-blog";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { BTN_NEW_BLOG, MANAGE_BLOG_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";

const breadcrumbs = [
    { label: MANAGE_BLOG_PAGE_HEADING, href: "/dashboard/blogs" },
    { label: BTN_NEW_BLOG, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                UIConstants.permissions.manageAnyCourse,
                UIConstants.permissions.manageCourse,
            ]}
        >
            <NewBlog />
        </DashboardContent>
    );
}
