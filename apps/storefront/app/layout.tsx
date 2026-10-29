import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

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
  title: "CourseLit",
  description: "CourseLit Learning Platform",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-product="courselit"
      className={`${hankenGrotesk.variable} ${splineSansMono.variable} font-sans`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
