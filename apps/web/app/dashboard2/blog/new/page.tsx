"use client";

import { NewBlog } from "@components/admin/blogs/new-blog";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);

    return (
        <NewBlog address={address} networkAction={false} prefix="/dashboard2" />
    );
}
