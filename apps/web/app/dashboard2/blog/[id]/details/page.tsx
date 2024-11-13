"use client";

import { Details } from "@components/admin/blogs/editor/details";
import { AddressContext, ProfileContext } from "@components/contexts";
import { Profile } from "@courselit/common-models";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const { id } = params;

    return (
        <Details
            id={id as string}
            address={address}
            profile={profile as Profile}
        />
    );
}
