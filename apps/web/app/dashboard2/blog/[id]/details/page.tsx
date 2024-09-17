"use client";

import { Details } from "@components/admin/blogs/editor/details";
import BlogEditorLayout from "@components/admin/blogs/editor/layout";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { Profile } from "@courselit/common-models";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const siteinfo = useContext(SiteInfoContext);
    const { id } = params;

    return (
        <BlogEditorLayout
            id={id}
            profile={profile as Profile}
            siteInfo={siteinfo}
            address={address}
            prefix="dashboard2"
        >
            <Details
                id={id as string}
                address={address}
                profile={profile as Profile}
            />
        </BlogEditorLayout>
    );
}
