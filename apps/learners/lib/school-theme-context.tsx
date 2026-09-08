"use client";

import type { Theme, ThemeStyle } from "@frontlit/page-builder/models";
import { createContext, type ReactNode, useContext } from "react";

const SchoolThemeContext = createContext<Theme | null>(null);

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
