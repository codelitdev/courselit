import { type ReactNode, Suspense } from "react";
import { CodeInjector } from "../../../components/code-injector";
import { SchoolThemeProvider } from "../../../components/school-theme-provider";
import { LearnerTooltipProvider } from "../../../components/themed-page-builder";
import { getSettings } from "../../../lib/courselit-public";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const settings = await getSettings(schoolId);
  const metadataBase = settings?.canonicalHost
    ? new URL(`https://${settings.canonicalHost}`)
    : undefined;
  const title = settings?.title?.trim() || "CourseLit";
  const subtitle = settings?.subtitle?.trim();
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : "/icon.svg";

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: subtitle ? `${title} | ${subtitle}` : title,
      template: `%s | ${title}`,
    },
    description: subtitle || undefined,
    icons: {
      icon: siteLogoUrl,
      shortcut: siteLogoUrl,
      apple: siteLogoUrl,
    },
  };
}

function StorefrontProviders({
  children,
  title,
  subtitle,
  themeId,
  themeStyle,
  logoUrl,
  logoAlt,
}: {
  children: ReactNode;
  title?: string | null;
  subtitle?: string | null;
  themeId?: string | null;
  themeStyle?: Record<string, unknown> | null;
  logoUrl?: string | null;
  logoAlt?: string | null;
}) {
  return (
    <SchoolThemeProvider
      title={title}
      subtitle={subtitle}
      themeId={themeId}
      themeStyle={themeStyle}
      logoUrl={logoUrl}
      logoAlt={logoAlt}
    >
      <LearnerTooltipProvider>{children}</LearnerTooltipProvider>
    </SchoolThemeProvider>
  );
}

async function ConfiguredStorefront({
  schoolId,
  children,
}: {
  schoolId: string;
  children: ReactNode;
}) {
  const settings = await getSettings(schoolId);
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" && settings.logo.url.trim()
      ? settings.logo.url.trim()
      : "/icon.svg";
  const siteLogoAlt = settings?.logo?.alt ?? "CourseLit";

  return (
    <>
      <StorefrontProviders
        title={settings?.title}
        subtitle={settings?.subtitle}
        themeId={settings?.themeId ?? null}
        themeStyle={settings?.theme ?? null}
        logoUrl={siteLogoUrl}
        logoAlt={siteLogoAlt}
      >
        {children}
      </StorefrontProviders>
      <CodeInjector
        head={settings?.codeInjectionHead}
        body={settings?.codeInjectionBody}
      />
    </>
  );
}

export default async function SchoolLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;

  return (
    <Suspense fallback={<StorefrontProviders>{children}</StorefrontProviders>}>
      <ConfiguredStorefront schoolId={schoolId}>{children}</ConfiguredStorefront>
    </Suspense>
  );
}
