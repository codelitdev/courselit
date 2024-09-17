"use client";

import { AddressContext, ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

export default function Layout({ children }) {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);

    if (!checkPermission(profile.permissions!, [permissions.manageUsers])) {
        redirect("/dashboard2");
    }

    return <div className="mx-auto lg:max-w-[1200px] w-full">{children}</div>;
}
