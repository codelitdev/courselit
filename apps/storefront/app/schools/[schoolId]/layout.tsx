import { type ReactNode, Suspense } from "react";
import { CodeInjector } from "../../../components/code-injector";
import { LegalPagesProvider, SchoolProvider } from "../../../components/school-context";
import { SchoolThemeProvider } from "../../../components/school-theme-provider";
import { LearnerTooltipProvider } from "../../../components/themed-page-builder";
import { getPageBySlug, getSettings } from "../../../lib/courselit-public";
import { siteLogoAlt, siteLogoUrl, siteTitle } from "../../../lib/site-branding";

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
  const title = siteTitle(settings);
  const subtitle = settings?.subtitle?.trim();
  const logoUrl = siteLogoUrl(settings);

  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: {
      default: subtitle ? `${title} | ${subtitle}` : title,
      template: `%s | ${title}`,
    },
    description: subtitle || undefined,
    icons: {
      icon: logoUrl,
      shortcut: logoUrl,
      apple: logoUrl,
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
  const [settings, termsPage, privacyPage] = await Promise.all([
    getSettings(schoolId),
    getPageBySlug(schoolId, "terms"),
    getPageBySlug(schoolId, "privacy"),
  ]);

  return (
    <LegalPagesProvider
      value={{ terms: Boolean(termsPage), privacy: Boolean(privacyPage) }}
    >
      <StorefrontProviders
        title={settings?.title}
        subtitle={settings?.subtitle}
        themeId={settings?.themeId ?? null}
        themeStyle={settings?.theme ?? null}
        logoUrl={siteLogoUrl(settings)}
        logoAlt={siteLogoAlt(settings)}
      >
        {children}
      </StorefrontProviders>
      <CodeInjector
        head={settings?.codeInjectionHead}
        body={settings?.codeInjectionBody}
      />
    </LegalPagesProvider>
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
    <SchoolProvider schoolId={schoolId}>
      <Suspense fallback={<StorefrontProviders>{children}</StorefrontProviders>}>
        <ConfiguredStorefront schoolId={schoolId}>{children}</ConfiguredStorefront>
      </Suspense>
    </SchoolProvider>
  );
}
