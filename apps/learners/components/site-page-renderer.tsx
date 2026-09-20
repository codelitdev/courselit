"use client";

import { registerCourseSalesBlocks } from "@courselit/page-blocks";
import type { PageData, WidgetInstance } from "@frontlit/page-builder/models";
import { Section } from "@frontlit/page-builder/primitives";
import type { PageBuilderLinkProps } from "@frontlit/page-builder/renderer";
import { PageRenderer } from "@frontlit/page-builder/renderer";
import NextLink from "next/link";
import {
  SchoolThemeContextProvider,
  useSchoolThemeMode,
  useSchoolThemeStyle,
} from "@/lib/school-theme-context";
import { resolveSchoolTheme } from "@/lib/site-theme";

registerCourseSalesBlocks();

export const LEARNER_THEME_MODE_KEY = "courselit-learner-theme-mode";

function SiteLink(props: PageBuilderLinkProps) {
  return <NextLink {...props} />;
}

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
  const { mode, mounted, setMode } = useSchoolThemeMode();
  const nextTheme = mounted ? mode : "light";

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
        themeMode={mode}
        onThemeModeChange={(mode) => {
          if (mode === "light" || mode === "dark") {
            setMode(mode);
            try {
              window.localStorage.setItem(LEARNER_THEME_MODE_KEY, mode);
            } catch {
              // Local storage may be restricted
            }
          }
        }}
        linkComponent={SiteLink}
      >
        {children}
      </PageRenderer>
    </SchoolThemeContextProvider>
  );
}
