import "./global.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DocsProvider } from "@/components/docs-provider";

export const metadata: Metadata = {
    title: {
        default: "CourseLit Docs",
        template: "%s | CourseLit Docs",
    },
    description: "Documentation for CourseLit.",
};

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="min-h-screen">
                <DocsProvider>{children}</DocsProvider>
            </body>
        </html>
    );
}
