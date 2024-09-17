"use client";

import { Publish } from "@components/admin/blogs/editor/publish";
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
            <Publish id={id} address={address} loading={false} />
        </BlogEditorLayout>
    );
}
