"use client";

import * as React from "react";
import {
    applyThemeToDocument,
    DEFAULT_THEME,
    getDocumentTheme,
    getStoredTheme,
    getSystemTheme,
    resolveTheme,
    THEME_STORAGE_KEY,
    ThemeAttribute,
    ThemeMode,
    THEMES,
    type ResolvedTheme,
} from "./theme";

interface ThemeContextValue {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    resolvedTheme: ResolvedTheme;
    systemTheme: ResolvedTheme;
    themes: ThemeMode[];
}

export interface ThemeProviderProps {
    children: React.ReactNode;
    attribute?: ThemeAttribute;
    defaultTheme?: ThemeMode;
    disableTransitionOnChange?: boolean;
    enableColorScheme?: boolean;
    enableSystem?: boolean;
    storageKey?: string;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
    undefined,
);

function disableTransitions() {
    const style = document.createElement("style");

    style.appendChild(
        document.createTextNode(
            "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}",
        ),
    );
    document.head.appendChild(style);

    return () => {
        window.getComputedStyle(document.body);
        window.setTimeout(() => {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 1);
    };
}

export function ThemeProvider({
    attribute = "class",
    children,
    defaultTheme = DEFAULT_THEME,
    disableTransitionOnChange = false,
    enableColorScheme = true,
    enableSystem = true,
    storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
    const [theme, setThemeState] = React.useState<ThemeMode>(() =>
        getStoredTheme(storageKey, defaultTheme),
    );
    const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
        () => getDocumentTheme(attribute),
    );
    const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
        typeof window === "undefined" ? "light" : getSystemTheme(),
    );

    const applyResolvedTheme = React.useCallback(
        (nextResolvedTheme: ResolvedTheme) => {
            const enableTransitionCleanup = disableTransitionOnChange
                ? disableTransitions()
                : undefined;

            applyThemeToDocument({
                attribute,
                enableColorScheme,
                resolvedTheme: nextResolvedTheme,
            });

            enableTransitionCleanup?.();
        },
        [attribute, disableTransitionOnChange, enableColorScheme],
    );

    React.useEffect(() => {
        const syncTheme = (
            nextTheme = getStoredTheme(storageKey, defaultTheme),
        ) => {
            const nextSystemTheme = getSystemTheme();
            const nextResolvedTheme = resolveTheme(nextTheme, enableSystem);

            setThemeState(nextTheme);
            setSystemTheme(nextSystemTheme);
            setResolvedTheme(nextResolvedTheme);
            applyResolvedTheme(nextResolvedTheme);
        };

        syncTheme();

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const onSystemThemeChange = () => {
            const nextSystemTheme = getSystemTheme();

            setSystemTheme(nextSystemTheme);

            if (theme === "system") {
                setResolvedTheme(nextSystemTheme);
                applyResolvedTheme(nextSystemTheme);
            }
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key && event.key !== storageKey) {
                return;
            }

            syncTheme();
        };

        mediaQuery.addEventListener("change", onSystemThemeChange);
        window.addEventListener("storage", onStorage);

        return () => {
            mediaQuery.removeEventListener("change", onSystemThemeChange);
            window.removeEventListener("storage", onStorage);
        };
    }, [applyResolvedTheme, defaultTheme, enableSystem, storageKey, theme]);

    const setTheme = React.useCallback(
        (nextTheme: ThemeMode) => {
            setThemeState(nextTheme);
            setSystemTheme(getSystemTheme());

            try {
                window.localStorage.setItem(storageKey, nextTheme);
            } catch {}

            const nextResolvedTheme = resolveTheme(nextTheme, enableSystem);

            setResolvedTheme(nextResolvedTheme);
            applyResolvedTheme(nextResolvedTheme);
        },
        [applyResolvedTheme, enableSystem, storageKey],
    );

    const value = React.useMemo(() => {
        const themes: ThemeMode[] = enableSystem
            ? [...THEMES, DEFAULT_THEME]
            : [...THEMES];

        return {
            resolvedTheme,
            setTheme,
            systemTheme,
            theme,
            themes,
        };
    }, [enableSystem, resolvedTheme, setTheme, systemTheme, theme]);

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    return (
        React.useContext(ThemeContext) ?? {
            resolvedTheme: "light" as ResolvedTheme,
            setTheme: () => undefined,
            systemTheme: "light" as ResolvedTheme,
            theme: DEFAULT_THEME as ThemeMode,
            themes: [...THEMES, DEFAULT_THEME] as ThemeMode[],
        }
    );
}
