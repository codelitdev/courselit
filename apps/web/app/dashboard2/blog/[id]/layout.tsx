"use client";

import BlogEditorLayout from "@components/admin/blogs/editor/layout";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { Profile, UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { ReactNode, useContext } from "react";
const { permissions } = UIConstants;

export default function Page({
    params,
    children,
}: {
    params: { id: string };
    children: ReactNode;
}) {
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const { id } = params;
    const profile = useContext(ProfileContext);

    if (
        !checkPermission(profile.permissions!, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        // redirect("/dashboard2");
    }

    return (
        <BlogEditorLayout
            id={id}
            profile={profile as Profile}
            siteInfo={siteinfo}
            address={address}
            prefix="/dashboard2"
        >
            {children}
        </BlogEditorLayout>
    );
}
