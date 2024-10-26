"use client";

import { Index as Blogs } from "@components/admin/blogs";
import LoadingScreen from "@components/admin/loading-screen";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { useContext } from "react";
const { permissions } = UIConstants;

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
        <Blogs
            address={address}
            loading={false}
            siteinfo={siteinfo}
            prefix="/dashboard2"
        />
    );
}
