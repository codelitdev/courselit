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

    return (
        <div className="mx-auto lg:max-w-[1200px] w-full">
            {/** TODO: Remove dispatch and loading from Pages component */}
            <Pages address={address} loading={false} dispatch={() => {}} />
        </div>
    );
}
