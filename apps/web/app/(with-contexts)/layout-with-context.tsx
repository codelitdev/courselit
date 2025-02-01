"use client";

import { ReactNode, useEffect, useState } from "react";
import { SiteInfo, Typeface, ServerConfig } from "@courselit/common-models";
import { defaultState } from "@components/default-state";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    TypefacesContext,
    ServerConfigContext,
} from "@components/contexts";
import { Toaster, useToast } from "@courselit/components-library";
import { ERROR_SNACKBAR_PREFIX } from "@ui-config/strings";
import { Session } from "next-auth";

export default function Layout({
    address,
    children,
    siteinfo,
    typefaces,
    config,
    session,
}: {
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
    typefaces: Typeface[];
    config: ServerConfig;
    session: Session | null;
}) {
    const [profile, setProfile] = useState(defaultState.profile);
    const { toast } = useToast();

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
            } catch (err) {
                toast({
                    title: ERROR_SNACKBAR_PREFIX,
                    description: err.message,
                });
            }
        };

        if (address && session) {
            getUserProfile();
        }
    }, [address, session]);

    return (
        <AddressContext.Provider
            value={{
                backend: address,
                frontend: address,
            }}
        >
            <SiteInfoContext.Provider value={siteinfo}>
                <ProfileContext.Provider value={{ profile, setProfile }}>
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
