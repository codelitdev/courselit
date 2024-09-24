"use client";

import Mails from "@components/admin/mails";
import { AddressContext } from "@components/contexts";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";

export default function Page() {
    const address = useContext(AddressContext);
    const searchParams = useSearchParams();

    const tab = searchParams?.get("tab") || "Broadcasts";

    return (
        <Mails
            selectedTab={tab}
            address={address}
            prefix="/dashboard2"
            loading={false}
        />
    );
}
