import { useCallback, useContext, useEffect, useState } from "react";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { ThemeWithDraftState } from "./theme-editor/theme-with-draft-state";

export default function useThemes() {
    const [themes, setThemes] = useState<{
        system: ThemeWithDraftState[];
        custom: ThemeWithDraftState[];
    }>({ system: [], custom: [] });
    const [error, setError] = useState<string | null>(null);
    const [theme, setTheme] = useState<ThemeWithDraftState | null>(null);
    const [loaded, setLoaded] = useState(false);
    const address = useContext(AddressContext);

    useEffect(() => {
        if (theme) {
            replaceThemeInThemesArray(theme);
        }
    }, [theme]);

    const replaceThemeInThemesArray = useCallback(
        (theme: ThemeWithDraftState) => {
            setThemes((prev) => ({
                ...prev,
                system: prev.system.map((t) => (t.id === theme.id ? theme : t)),
                custom: prev.custom.map((t) => (t.id === theme.id ? theme : t)),
            }));
        },
        [],
    );

    const loadThemes = useCallback(async () => {
        setLoaded(false);
        const query = `
        query {
            themes: getThemes {
                system {
                    themeId
                    name
                    theme {
                        colors
                        typography
                        interactives
                        structure
                    }
                    draftTheme {
                        colors
                        typography
                        interactives
                        structure
                    }
                }
                custom {
                    themeId
                    name
                    theme {
                        colors
                        typography
                        interactives
                        structure
                    }
                    draftTheme {
                        colors
                        typography
                        interactives
                        structure
                    }
                }
            }
            site: getSiteInfo {
                lastEditedThemeId
            }
        }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({ query })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const { themes, site } = await fetch.exec();
            if (themes) {
                const transformedThemes = {
                    system: themes.system.map(transformServerTheme),
                    custom: themes.custom.map(transformServerTheme),
                };
                setThemes(transformedThemes);
                if (site) {
                    let lastEditedTheme = transformedThemes.system.find(
                        (t) => t.id === site.lastEditedThemeId,
                    );
                    if (!lastEditedTheme) {
                        lastEditedTheme = transformedThemes.custom.find(
                            (t) => t.id === site.lastEditedThemeId,
                        );
                    }
                    if (lastEditedTheme) {
                        setTheme(lastEditedTheme);
                    }
                }
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoaded(true);
        }
    }, [address.backend]);

    useEffect(() => {
        if (address) {
            loadThemes();
        }
    }, [loadThemes, address]);

    return { themes, theme, setTheme, loadThemes, loaded, error };
}

export function transformServerTheme(serverTheme): ThemeWithDraftState {
    return {
        id: serverTheme.themeId,
        name: serverTheme.name,
        theme: serverTheme.theme,
        draftTheme: serverTheme.draftTheme,
    };
}
