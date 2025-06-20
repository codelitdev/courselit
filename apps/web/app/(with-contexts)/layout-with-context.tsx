"use client";

import { ReactNode, useEffect, useState, Suspense } from "react";
import { SiteInfo, ServerConfig } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    ServerConfigContext,
    ThemeContext,
} from "@components/contexts";
import { Toaster, useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { Session } from "next-auth";
import { Theme } from "@courselit/page-models";
import { ThemeProvider as NextThemesProvider } from "@components/next-theme-provider";
import { defaultState } from "@components/default-state";
import RecaptchaScriptLoader from "@components/recaptcha-script-loader";

function LayoutContent({
    address,
    children,
    siteinfo,
    theme: initialTheme,
    config,
    session,
}: {
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
    theme: Theme;
    config: ServerConfig;
    session: Session | null;
}) {
    const [profile, setProfile] = useState(defaultState.profile);
    const [theme, setTheme] = useState(initialTheme);
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
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
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
                <ThemeContext.Provider value={{ theme, setTheme }}>
                    <ServerConfigContext.Provider value={config}>
                        <NextThemesProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            <ProfileContext.Provider
                                value={{ profile, setProfile }}
                            >
                                <Suspense fallback={null}>{children}</Suspense>
                            </ProfileContext.Provider>
                            <RecaptchaScriptLoader />
                        </NextThemesProvider>
                    </ServerConfigContext.Provider>
                </ThemeContext.Provider>
            </SiteInfoContext.Provider>
            <Toaster />
        </AddressContext.Provider>
    );
}

export default function Layout(props: {
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
    theme: Theme;
    config: ServerConfig;
    session: Session | null;
    // profile: Partial<Profile> | null;
}) {
    return (
        <Suspense fallback={null}>
            <LayoutContent {...props} />
        </Suspense>
    );
}

// function formatHSL(hsl: HSL): string {
//     return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
// }
