"use client";

import PageEditor from "@components/admin/page-editor";
import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    ThemeContext,
    TypefacesContext,
} from "@components/contexts";
import { Profile, UIConstants } from "@courselit/common-models";
import { useSearchParams } from "next/navigation";
import { useContext, use } from "react";
import { checkPermission } from "@courselit/utils";

import PermissionError from "@/components/admin/permission-error";

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const { id } = params;
    const searchParams = useSearchParams();
    const redirectTo = searchParams?.get("redirectTo");
    const address = useContext(AddressContext);
    const siteInfo = useContext(SiteInfoContext);
    const typefaces = useContext(TypefacesContext);
    const { profile } = useContext(ProfileContext);
    const config = useContext(ServerConfigContext);
    const { theme } = useContext(ThemeContext);

    if (
        profile &&
        profile.permissions &&
        !checkPermission(profile.permissions, [
            UIConstants.permissions.manageSite,
        ])
    ) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <PermissionError
                    missingPermissions={[UIConstants.permissions.manageSite]}
                />
            </div>
        );
    }

    return (
        <PageEditor
            id={id as string}
            address={address}
            siteInfo={siteInfo}
            typefaces={typefaces}
            profile={profile as Profile}
            redirectTo={
                redirectTo
                    ? typeof redirectTo === "string"
                        ? redirectTo
                        : redirectTo[0]
                    : ""
            }
            state={{
                config: config,
                siteinfo: siteInfo,
                address: address,
                profile: profile as Profile,
                auth: profile!.email
                    ? {
                          guest: false,
                          checked: true,
                      }
                    : {
                          guest: true,
                          checked: true,
                      },
                networkAction: false,
                theme,
                typefaces: [
                    {
                        section: "default",
                        typeface: "",
                        fontWeights: [100],
                        fontSize: 0,
                        lineHeight: 0,
                        letterSpacing: 0,
                        case: "captilize",
                    },
                ],
                message: {
                    message: "",
                    open: false,
                    action: null,
                },
            }}
        />
    );
}
