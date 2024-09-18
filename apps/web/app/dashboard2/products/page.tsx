"use client";

import { Index as Products } from "@components/admin/products";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect } from "next/navigation";
import { useContext } from "react";
const { permissions } = UIConstants;

export default function Page() {
    const address = useContext(AddressContext);
    const profile = useContext(ProfileContext);
    const siteinfo = useContext(SiteInfoContext);

    if (
        !checkPermission(profile.permissions!, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        redirect("/dashboard2");
    }

    return (
        <div className="mx-auto lg:max-w-[1200px] w-full">
            <Products address={address} loading={false} siteinfo={siteinfo} />
        </div>
    );
}
