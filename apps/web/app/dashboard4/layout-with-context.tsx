"use client";

import { AppSidebar } from "@components/admin/dashboard-skeleton/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteInfo } from "@courselit/common-models";
import { ReactNode, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { defaultState } from "@components/default-state";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";

export default function Layout({
    session,
    address,
    children,
    siteinfo,
}: {
    session: any;
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
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
                    <SidebarProvider>
                        <AppSidebar />
                        <SidebarInset>{children}</SidebarInset>
                    </SidebarProvider>
                </ProfileContext.Provider>
            </SiteInfoContext.Provider>
        </AddressContext.Provider>
    );
}
