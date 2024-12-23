"use client";

import { NewBlog } from "@components/admin/blogs/new-blog";
import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext } from "@components/contexts";
import { BTN_NEW_BLOG, MANAGE_BLOG_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";

const breadcrumbs = [
    { label: MANAGE_BLOG_PAGE_HEADING, href: "/dashboard4/blogs" },
    { label: BTN_NEW_BLOG, href: "#" },
];

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <NewBlog
                address={address}
                networkAction={false}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
