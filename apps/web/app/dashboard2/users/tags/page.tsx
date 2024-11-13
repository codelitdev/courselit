"use client";

import Tags from "@components/admin/users/tags";
import { AddressContext } from "@components/contexts";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);

    return <Tags address={address} prefix="/dashboard2" />;
}
