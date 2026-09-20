"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SchoolBrandContextProvider,
  SchoolThemeContextProvider,
  SchoolThemeModeProvider,
} from "@/lib/school-theme-context";
import { resolveSchoolTheme, schoolThemeStyleTag } from "@/lib/site-theme";
import { LearnerToaster } from "./themed-sonner";

export function SchoolThemeProvider({
  themeId,
  themeStyle,
  logoUrl,
  logoAlt,
  children,
}: {
  themeId?: string | null;
  themeStyle?: Record<string, unknown> | null;
  logoUrl?: string | null;
  logoAlt?: string | null;
  children: React.ReactNode;
}) {
  const [activeThemeId, setActiveThemeId] = useState<string | null>(themeId ?? null);
  const [activeThemeStyle, setActiveThemeStyle] = useState<Record<
    string,
    unknown
  > | null>(themeStyle ?? null);

  useEffect(() => {
    if (themeId !== undefined) {
      setActiveThemeId(themeId);
    }
    setActiveThemeStyle(themeStyle ?? null);
  }, [themeId, themeStyle]);

  const resolvedTheme = useMemo(
    () => resolveSchoolTheme(activeThemeId, activeThemeStyle),
    [activeThemeId, activeThemeStyle],
  );

  const styleCss = useMemo(
    () => schoolThemeStyleTag(resolvedTheme, ":root"),
    [resolvedTheme],
  );

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: theme CSS is generated from the resolved school theme. */}
      <style id="school-theme-styles" dangerouslySetInnerHTML={{ __html: styleCss }} />
      <SchoolThemeModeProvider>
        <SchoolBrandContextProvider logoUrl={logoUrl} logoAlt={logoAlt}>
          <SchoolThemeContextProvider theme={resolvedTheme}>
            {children}
            <LearnerToaster />
          </SchoolThemeContextProvider>
        </SchoolBrandContextProvider>
      </SchoolThemeModeProvider>
    </>
  );
}
