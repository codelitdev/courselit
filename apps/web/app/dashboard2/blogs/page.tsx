"use client";

import { Index as Blogs } from "@components/admin/blogs";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect } from "next/navigation";
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
        redirect("/dashboard2");
    }

    return <Blogs address={address} loading={false} siteinfo={siteinfo} />;
}
