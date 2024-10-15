"use client";

import LoadingScreen from "@components/admin/loading-screen";
import { ProfileContext } from "@components/contexts";
import { UIConstants } from "@courselit/common-models";
import { Toaster } from "@courselit/components-library";
import { checkPermission } from "@courselit/utils";
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
        return <LoadingScreen />;
    }

    return (
        <>
            {children}
            <Toaster />
        </>
    );
}
