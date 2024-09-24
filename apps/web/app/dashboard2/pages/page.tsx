"use client";

import { Pages } from "@components/admin/pages";
import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageSite])) {
        redirect("/dashboard2");
    }

    return <Pages address={address} loading={false} dispatch={() => {}} />;
}
