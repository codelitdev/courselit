export const THEME_STORAGE_KEY = "theme";
export const DEFAULT_THEME = "system";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
export const THEMES = ["light", "dark"] as const;

export type ResolvedTheme = (typeof THEMES)[number];
export type ThemeMode = ResolvedTheme | typeof DEFAULT_THEME;
export type ThemeAttribute = "class" | `data-${string}`;

export function isResolvedTheme(
    theme: string | undefined,
): theme is ResolvedTheme {
    return theme === "light" || theme === "dark";
}

export function isThemeMode(theme: string | undefined): theme is ThemeMode {
    return theme === DEFAULT_THEME || isResolvedTheme(theme);
}

export function getSystemTheme() {
    return window.matchMedia(DARK_MEDIA_QUERY).matches ? "dark" : "light";
}

export function resolveTheme(
    theme: ThemeMode,
    enableSystem: boolean,
): ResolvedTheme {
    if (theme === DEFAULT_THEME) {
        return enableSystem ? getSystemTheme() : "light";
    }

    return theme;
}

export function getStoredTheme(
    storageKey: string,
    defaultTheme: ThemeMode,
): ThemeMode {
    if (typeof window === "undefined") {
        return defaultTheme;
    }

    try {
        const storedTheme =
            window.localStorage.getItem(storageKey) ?? undefined;
        if (isThemeMode(storedTheme)) {
            return storedTheme;
        }
    } catch {
        return defaultTheme;
    }

    return defaultTheme;
}

export function getDocumentTheme(attribute: ThemeAttribute): ResolvedTheme {
    if (typeof document === "undefined") {
        return "light";
    }

    const root = document.documentElement;

    if (attribute === "class") {
        if (root.classList.contains("dark")) {
            return "dark";
        }

        if (root.classList.contains("light")) {
            return "light";
        }
    } else {
        const attributeValue = root.getAttribute(attribute) ?? undefined;

        if (isResolvedTheme(attributeValue)) {
            return attributeValue;
        }
    }

    if (typeof window === "undefined") {
        return "light";
    }

    return getSystemTheme();
}

export function applyThemeToDocument({
    attribute,
    enableColorScheme,
    resolvedTheme,
}: {
    attribute: ThemeAttribute;
    enableColorScheme: boolean;
    resolvedTheme: ResolvedTheme;
}) {
    if (typeof document === "undefined") {
        return;
    }

    const root = document.documentElement;

    if (attribute === "class") {
        root.classList.remove(...THEMES);
        root.classList.add(resolvedTheme);
    } else {
        root.setAttribute(attribute, resolvedTheme);
    }

    if (enableColorScheme) {
        root.style.colorScheme = resolvedTheme;
    }
}

export function getThemeBootstrapScript({
    attribute = "class",
    defaultTheme = DEFAULT_THEME,
    enableSystem = true,
    enableColorScheme = true,
    storageKey = THEME_STORAGE_KEY,
}: {
    attribute?: ThemeAttribute;
    defaultTheme?: ThemeMode;
    enableSystem?: boolean;
    enableColorScheme?: boolean;
    storageKey?: string;
} = {}) {
    return `
(() => {
    const attribute = ${JSON.stringify(attribute)};
    const defaultTheme = ${JSON.stringify(defaultTheme)};
    const enableSystem = ${JSON.stringify(enableSystem)};
    const enableColorScheme = ${JSON.stringify(enableColorScheme)};
    const storageKey = ${JSON.stringify(storageKey)};
    const root = document.documentElement;
    const getSystemTheme = () =>
        window.matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches
            ? "dark"
            : "light";
    const resolveTheme = (theme) =>
        theme === "system"
            ? enableSystem
                ? getSystemTheme()
                : "light"
            : theme;

    try {
        const storedTheme = localStorage.getItem(storageKey);
        const theme =
            storedTheme === "light" ||
            storedTheme === "dark" ||
            storedTheme === "system"
                ? storedTheme
                : defaultTheme;
        const resolvedTheme = resolveTheme(theme);

        if (attribute === "class") {
            root.classList.remove("light", "dark");
            root.classList.add(resolvedTheme);
        } else {
            root.setAttribute(attribute, resolvedTheme);
        }

        if (enableColorScheme) {
            root.style.colorScheme = resolvedTheme;
        }
    } catch {
        const resolvedTheme = resolveTheme(defaultTheme);

        if (attribute === "class") {
            root.classList.remove("light", "dark");
            root.classList.add(resolvedTheme);
        } else {
            root.setAttribute(attribute, resolvedTheme);
        }

        if (enableColorScheme) {
            root.style.colorScheme = resolvedTheme;
        }
    }
})();
    `.trim();
}
