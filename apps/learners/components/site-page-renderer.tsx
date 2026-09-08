"use client";

import type { PageData, WidgetInstance } from "@frontlit/page-builder/models";
import { Section } from "@frontlit/page-builder/primitives";
import type { PageBuilderLinkProps } from "@frontlit/page-builder/renderer";
import { PageRenderer } from "@frontlit/page-builder/renderer";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import {
  SchoolThemeContextProvider,
  useSchoolThemeStyle,
} from "@/lib/school-theme-context";
import { resolveSchoolTheme } from "@/lib/site-theme";

function SiteLink(props: PageBuilderLinkProps) {
  return <NextLink {...props} />;
}

type LearnerThemeMode = "light" | "dark";
const LEARNER_THEME_MODE_KEY = "courselit-learner-theme-mode";

/** Wraps CourseLit-owned route content in the same themed page primitive used
 * by FrontLit site pages. It intentionally lives under the page renderer's
 * theme provider so dynamic system routes use the active school theme. */
export function SitePageSection({ children }: { children: React.ReactNode }) {
  const theme = useSchoolThemeStyle();
  return <Section theme={theme}>{children}</Section>;
}

export function SitePageRenderer({
  layout,
  themeId,
  themeStyle,
  pageData,
  siteLogoUrl,
  siteLogoAlt,
  children,
  dataSlots,
}: {
  layout: WidgetInstance[];
  themeId?: string | null;
  themeStyle?: Record<string, unknown> | null;
  pageData: PageData;
  siteLogoUrl?: string | null;
  siteLogoAlt?: string | null;
  children?: React.ReactNode;
  dataSlots?: Record<string, React.ReactNode>;
}) {
  const theme = resolveSchoolTheme(themeId ?? null, themeStyle ?? null);
  const [mounted, setMounted] = useState(false);
  const [themeMode, setThemeMode] = useState<LearnerThemeMode>("light");

  useEffect(() => {
    setMounted(true);
    try {
      const saved = window.localStorage.getItem(LEARNER_THEME_MODE_KEY);
      if (saved === "light" || saved === "dark") setThemeMode(saved);
    } catch {
      // Some browsers disable storage; the switcher still works for this visit.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(LEARNER_THEME_MODE_KEY, themeMode);
    } catch {
      // Some browsers disable storage; the switcher still works for this visit.
    }
  }, [mounted, themeMode]);

  const nextTheme = mounted ? themeMode : "light";

  return (
    <SchoolThemeContextProvider theme={theme}>
      <PageRenderer
        layout={layout}
        theme={theme}
        pageData={{
          ...pageData,
          ...(siteLogoUrl ? { siteLogoUrl } : {}),
          ...(siteLogoAlt ? { siteLogoAlt } : {}),
        }}
        dataSlots={dataSlots}
        nextTheme={nextTheme}
        themeMode={themeMode}
        onThemeModeChange={(mode) => {
          if (mode === "light" || mode === "dark") setThemeMode(mode);
        }}
        linkComponent={SiteLink}
      >
        {children}
      </PageRenderer>
    </SchoolThemeContextProvider>
  );
}
