"use client";

import { ReactNode, useEffect, useState, Suspense, useMemo } from "react";
import { SiteInfo, Typeface, ServerConfig } from "@courselit/common-models";
import { defaultState } from "@components/default-state";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
    TypefacesContext,
    ServerConfigContext,
    ThemeContext,
} from "@components/contexts";
import { Toaster, useToast } from "@courselit/components-library";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { Session } from "next-auth";
import { Theme } from "@courselit/page-models";
import convert, { HSL } from "color-convert";
import { ThemeProvider as NextThemesProvider } from "@components/next-theme-provider";

function LayoutContent({
    address,
    children,
    siteinfo,
    typefaces,
    theme: initialTheme,
    config,
    session,
}: {
    address: string;
    children: ReactNode;
    siteinfo: SiteInfo;
    typefaces: Typeface[];
    theme: Theme;
    config: ServerConfig;
    session: Session | null;
}) {
    const [profile, setProfile] = useState(defaultState.profile);
    const [theme, setTheme] = useState(initialTheme);
    const { toast } = useToast();
    const themeColors = useMemo(() => {
        return theme.theme.colors;
    }, [theme]);

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
                    <ProfileContext.Provider value={{ profile, setProfile }}>
                        <TypefacesContext.Provider value={typefaces}>
                            <ServerConfigContext.Provider value={config}>
                                <NextThemesProvider
                                    attribute="class"
                                    defaultTheme="system"
                                    enableSystem
                                    disableTransitionOnChange
                                >
                                    <Suspense fallback={null}>
                                        {children}
                                    </Suspense>
                                    <style jsx global>{`
                                        :root {
                                            --background: ${themeColors?.light
                                                ?.background
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.background?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --foreground: ${themeColors?.light
                                                ?.foreground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.foreground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --card: ${themeColors?.light?.card
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.card?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --card-foreground: ${themeColors
                                                ?.light?.cardForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.cardForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --primary: ${themeColors?.light
                                                ?.primary
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.primary?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --primary-foreground: ${themeColors
                                                ?.light?.primaryForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.primaryForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --secondary: ${themeColors?.light
                                                ?.secondary
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.secondary?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --secondary-foreground: ${themeColors
                                                ?.light?.secondaryForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.secondaryForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --muted: ${themeColors?.light?.muted
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.muted?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --muted-foreground: ${themeColors
                                                ?.light?.mutedForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.mutedForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --accent: ${themeColors?.light
                                                ?.accent
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.accent?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --accent-foreground: ${themeColors
                                                ?.light?.accentForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.accentForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --border: ${themeColors?.light
                                                ?.border
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.border?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --destructive: ${themeColors?.light
                                                ?.destructive
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.destructive?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --input: ${themeColors?.light?.input
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.light?.input?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --shadow-2xs: ${themeColors?.light
                                                ?.shadow2xs};
                                            --shadow-xs: ${themeColors?.light
                                                ?.shadowXs};
                                            --shadow-sm: ${themeColors?.light
                                                ?.shadowSm};
                                            --shadow: ${themeColors?.light
                                                ?.shadow};
                                            --shadow-md: ${themeColors?.light
                                                ?.shadowMd};
                                            --shadow-lg: ${themeColors?.light
                                                ?.shadowLg};
                                            --shadow-xl: ${themeColors?.light
                                                ?.shadowXl};
                                            --shadow-2xl: ${themeColors?.light
                                                ?.shadow2xl};
                                        }
                                        .dark {
                                            --background: ${themeColors?.dark
                                                ?.background
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.background?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --foreground: ${themeColors?.dark
                                                ?.foreground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.foreground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --card: ${themeColors?.dark?.card
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.card?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --card-foreground: ${themeColors
                                                ?.dark?.cardForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.cardForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --primary: ${themeColors?.dark
                                                ?.primary
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.primary?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --primary-foreground: ${themeColors
                                                ?.dark?.primaryForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.primaryForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --secondary: ${themeColors?.dark
                                                ?.secondary
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.secondary?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --secondary-foreground: ${themeColors
                                                ?.dark?.secondaryForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.secondaryForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --muted: ${themeColors?.dark?.muted
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.muted?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --muted-foreground: ${themeColors
                                                ?.dark?.mutedForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.mutedForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --accent: ${themeColors?.dark
                                                ?.accent
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.accent?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --accent-foreground: ${themeColors
                                                ?.dark?.accentForeground
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.accentForeground?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --border: ${themeColors?.dark
                                                ?.border
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.border?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --destructive: ${themeColors?.dark
                                                ?.destructive
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.destructive?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --input: ${themeColors?.dark?.input
                                                ? formatHSL(
                                                      convert.hex.hsl(
                                                          themeColors?.dark?.input?.replace(
                                                              "#",
                                                              "",
                                                          ),
                                                      ),
                                                  )
                                                : ""};
                                            --shadow-2xs: ${themeColors?.dark
                                                ?.shadow2xs};
                                            --shadow-xs: ${themeColors?.dark
                                                ?.shadowXs};
                                            --shadow-sm: ${themeColors?.dark
                                                ?.shadowSm};
                                            --shadow: ${themeColors?.dark
                                                ?.shadow};
                                            --shadow-md: ${themeColors?.dark
                                                ?.shadowMd};
                                            --shadow-lg: ${themeColors?.dark
                                                ?.shadowLg};
                                            --shadow-xl: ${themeColors?.dark
                                                ?.shadowXl};
                                            --shadow-2xl: ${themeColors?.dark
                                                ?.shadow2xl};
                                        }
                                    `}</style>
                                </NextThemesProvider>
                            </ServerConfigContext.Provider>
                        </TypefacesContext.Provider>
                    </ProfileContext.Provider>
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
    typefaces: Typeface[];
    theme: Theme;
    config: ServerConfig;
    session: Session | null;
}) {
    return (
        <Suspense fallback={null}>
            <LayoutContent {...props} />
        </Suspense>
    );
}

function formatHSL(hsl: HSL): string {
    return `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`;
}
