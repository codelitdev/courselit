"use client";

import Blogs from "@components/admin/blogs";
import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import { ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { MANAGE_BLOG_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_BLOG_PAGE_HEADING, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);

    if (!profile) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent
            breadcrumbs={breadcrumbs}
            permissions={[
                permissions.manageAnyCourse,
                permissions.manageCourse,
            ]}
        >
            <Blogs />
        </DashboardContent>
    );
}
