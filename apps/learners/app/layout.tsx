import { Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { CodeInjector } from "../components/code-injector";
import { SchoolThemeProvider } from "../components/school-theme-provider";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings(await requestHost());

  return (
    <html
      lang="en"
      data-product="courselit"
      className={`${hankenGrotesk.variable} ${splineSansMono.variable} font-sans`}
    >
      <body className="antialiased">
        <SchoolThemeProvider
          themeId={settings?.themeId ?? null}
          themeStyle={settings?.theme ?? null}
        >
          {children}
        </SchoolThemeProvider>
        <CodeInjector
          head={settings?.codeInjectionHead}
          body={settings?.codeInjectionBody}
        />
      </body>
    </html>
  );
}
