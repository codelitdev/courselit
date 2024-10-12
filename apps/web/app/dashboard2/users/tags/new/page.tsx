"use client";

import { NewTag } from "@components/admin/users/tags/new";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);

    return <NewTag address={address} />;
}
