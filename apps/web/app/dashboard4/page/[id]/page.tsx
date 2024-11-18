"use client";

import PageEditor from "@components/admin/page-editor";
import {
    AddressContext,
    ProfileContext,
    ServerConfigContext,
    SiteInfoContext,
    TypefacesContext,
} from "@components/contexts";
import { Profile } from "@courselit/common-models";
import { useSearchParams } from "next/navigation";
import { useContext } from "react";

export default function Page({ params }: { params: { id: string } }) {
    const { id } = params;
    const searchParams = useSearchParams();
    const redirectTo = searchParams?.get("redirectTo");
    const address = useContext(AddressContext);
    const siteInfo = useContext(SiteInfoContext);
    const typefaces = useContext(TypefacesContext);
    const profile = useContext(ProfileContext);
    const config = useContext(ServerConfigContext);

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
            prefix="/dashboard4"
            state={{
                config: config,
                siteinfo: siteInfo,
                address: address,
                profile: profile as Profile,
                auth: {
                    guest: profile ? false : true,
                    checked: profile ? true : false,
                },
                networkAction: false,
                theme: {
                    name: "dummy",
                    active: false,
                    styles: {},
                },
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
            dispatch={() => {}}
        />
    );
}
