"use client";

import { SiteInfo, Typeface, ServerConfig } from "@courselit/common-models";
import { ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { defaultState } from "@components/default-state";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    TypefacesContext,
    ServerConfigContext,
} from "@components/contexts";
import { Toaster } from "@courselit/components-library";

export default function Layout({
    session,
    address,
    children,
    siteinfo,
    typefaces,
    config,
}: {
    session: any;
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
    typefaces: Typeface[];
    config: ServerConfig;
}) {
    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState(defaultState.profile);
    const params = useSearchParams();
    const tab = params?.get("tab");

    useEffect(() => {
        const getUserProfile = async () => {
            const query = `
            { profile: getUser {
                name,
                id,
                email,
                userId,
                bio,
                permissions,
                purchases {
                    courseId,
                    completedLessons,
                    accessibleGroups
                }
                avatar {
                        mediaId,
                        originalFileName,
                        mimeType,
                        size,
                        access,
                        file,
                        thumbnail,
                        caption
                    },
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const response = await fetch.exec();
                if (response.profile) {
                    setProfile(response.profile);
                }
            } catch (e) {}
        };

        if (address) {
            getUserProfile();
        }
    }, [address]);

    return (
        <AddressContext.Provider
            value={{
                backend: address,
                frontend: address,
            }}
        >
            <SiteInfoContext.Provider value={siteinfo}>
                <ProfileContext.Provider value={profile}>
                    <TypefacesContext.Provider value={typefaces}>
                        <ServerConfigContext.Provider value={config}>
                        {children}
                        </ServerConfigContext.Provider>
                    </TypefacesContext.Provider>
                </ProfileContext.Provider>
            </SiteInfoContext.Provider>
            <Toaster />
        </AddressContext.Provider>
    );
}
