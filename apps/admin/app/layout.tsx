import localFont from "next/font/local";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import { BrowserObservabilityProvider } from "../components/browser-observability";
import { AdminShell } from "../components/layout/admin-shell";
import { getBrowserObservabilityConfig } from "../lib/observability-config";

// Bundled (Google Fonts, Latin subset) so builds never fetch fonts over the
// network.
const hankenGrotesk = localFont({
  src: "./fonts/hanken-grotesk-latin.woff2",
  weight: "100 900",
  variable: "--font-sans",
});
const splineSansMono = localFont({
  src: "./fonts/spline-sans-mono-latin.woff2",
  weight: "300 700",
  variable: "--font-mono",
});

export const metadata = {
  title: "CourseLit admin",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  await headers();
  const posthog = getBrowserObservabilityConfig();

  return (
    <html
      lang="en"
      data-product="courselit"
      className={`${hankenGrotesk.variable} ${splineSansMono.variable} font-sans`}
    >
      <body className="antialiased">
        {posthog ? (
          <BrowserObservabilityProvider
            apiKey={posthog.apiKey}
            host={posthog.host}
            environment={posthog.environment}
            serviceName={posthog.serviceName}
          >
            <AdminShell>{children}</AdminShell>
          </BrowserObservabilityProvider>
        ) : (
          <AdminShell>{children}</AdminShell>
        )}
      </body>
    </html>
  );
}
