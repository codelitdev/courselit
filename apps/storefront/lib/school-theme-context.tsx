"use client";

import type { Theme, ThemeStyle } from "@frontlit/page-builder/models";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

const SchoolThemeContext = createContext<Theme | null>(null);
const SchoolBrandContext = createContext<{
  title: string | null;
  subtitle: string | null;
  logoUrl: string | null;
  logoAlt: string | null;
}>({ title: null, subtitle: null, logoUrl: null, logoAlt: null });

type SchoolThemeMode = "light" | "dark";
const SCHOOL_THEME_MODE_KEY = "courselit-learner-theme-mode";
const SchoolThemeModeContext = createContext<{
  mode: SchoolThemeMode;
  mounted: boolean;
  setMode: (mode: SchoolThemeMode) => void;
  toggle: () => void;
} | null>(null);

/** Shares the resolved school theme with authenticated learner surfaces that
 * are not rendered from a public page layout. */
export function SchoolThemeContextProvider({
  theme,
  children,
}: {
  theme: Theme;
  children: ReactNode;
}) {
  return (
    <SchoolThemeContext.Provider value={theme}>{children}</SchoolThemeContext.Provider>
  );
}

export function useSchoolThemeStyle(): ThemeStyle {
  const theme = useContext(SchoolThemeContext);
  if (!theme) {
    throw new Error(
      "useSchoolThemeStyle must be used under SchoolThemeContextProvider",
    );
  }
  return theme.theme;
}

export function SchoolBrandContextProvider({
  title,
  subtitle,
  logoUrl,
  logoAlt,
  children,
}: {
  title?: string | null;
  subtitle?: string | null;
  logoUrl?: string | null;
  logoAlt?: string | null;
  children: ReactNode;
}) {
  return (
    <SchoolBrandContext.Provider
      value={
        {
          title: title ?? null,
          subtitle: subtitle ?? null,
          logoUrl: logoUrl ?? null,
          logoAlt: logoAlt ?? null,
        }
      }
    >
      {children}
    </SchoolBrandContext.Provider>
  );
}

export function useSchoolBrand() {
  return useContext(SchoolBrandContext);
}

export function SchoolThemeModeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<SchoolThemeMode>("light");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(SCHOOL_THEME_MODE_KEY);
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {
      // Keep the light default when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", mode === "dark");
    try {
      window.localStorage.setItem(SCHOOL_THEME_MODE_KEY, mode);
    } catch {
      // The preference still applies for this visit when storage is unavailable.
    }
  }, [mounted, mode]);

  return (
    <SchoolThemeModeContext.Provider
      value={{
        mode,
        mounted,
        setMode,
        toggle: () => setMode((current) => (current === "dark" ? "light" : "dark")),
      }}
    >
      {children}
    </SchoolThemeModeContext.Provider>
  );
}

export function useSchoolThemeMode() {
  const context = useContext(SchoolThemeModeContext);
  if (!context) {
    throw new Error("useSchoolThemeMode must be used under SchoolThemeModeProvider");
  }
  return context;
}
