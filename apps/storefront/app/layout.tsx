import { Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import { CodeInjector } from "../components/code-injector";
import { SchoolThemeProvider } from "../components/school-theme-provider";
import { LearnerTooltipProvider } from "../components/themed-page-builder";
import { getSettings } from "../lib/courselit-public";
import { requestHost } from "../lib/request-host";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});
const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "CourseLit",
};

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
  host,
  children,
}: {
  host: string;
  children: ReactNode;
}) {
  const settings = await getSettings(host);
  const siteLogoUrl =
    typeof settings?.logo?.url === "string" ? settings.logo.url : null;
  const siteLogoAlt = settings?.logo?.alt ?? null;

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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const host = await requestHost();

  return (
    <html
      lang="en"
      data-product="courselit"
      className={`${hankenGrotesk.variable} ${splineSansMono.variable} font-sans`}
    >
      <body className="antialiased">
        <Suspense
          fallback={
            <StorefrontProviders>
              {children}
            </StorefrontProviders>
          }
        >
          <ConfiguredStorefront host={host}>{children}</ConfiguredStorefront>
        </Suspense>
      </body>
    </html>
  );
}
