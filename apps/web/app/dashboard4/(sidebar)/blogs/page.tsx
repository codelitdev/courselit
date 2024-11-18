"use client";

import { Index as Blogs } from "@components/admin/blogs";
import DashboardContent from "@components/admin/dashboard-content";
import LoadingScreen from "@components/admin/loading-screen";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { MANAGE_BLOG_PAGE_HEADING } from "@ui-config/strings";
import { useContext } from "react";
const { permissions } = UIConstants;

const breadcrumbs = [{ label: MANAGE_BLOG_PAGE_HEADING, href: "#" }];

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const siteinfo = useContext(SiteInfoContext);

    if (
        !checkPermission(profile.permissions!, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        return <LoadingScreen />;
    }

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <Blogs
                address={address}
                loading={false}
                siteinfo={siteinfo}
                prefix="/dashboard4"
            />
        </DashboardContent>
    );
}
