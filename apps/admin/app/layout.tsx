import { Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";
import { BrowserObservabilityProvider } from "../components/browser-observability";
import { AdminShell } from "../components/layout/admin-shell";
import { getBrowserObservabilityConfig } from "../lib/observability-config";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});
const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
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
