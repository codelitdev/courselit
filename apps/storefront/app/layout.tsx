import { Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

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
