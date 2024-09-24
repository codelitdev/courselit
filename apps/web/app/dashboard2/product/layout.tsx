"use client";

import { ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { redirect } from "next/navigation";
import { ReactNode, useContext } from "react";
const { permissions } = UIConstants;

export default function Page({ children }: { children: ReactNode }) {
    const profile = useContext(ProfileContext);

    if (
        !checkPermission(profile.permissions!, [
            permissions.manageAnyCourse,
            permissions.manageCourse,
        ])
    ) {
        redirect("/dashboard2");
    }

    return <>{children}</>;
}
