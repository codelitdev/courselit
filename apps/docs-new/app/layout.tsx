import "./global.css";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

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
                <RootProvider
                    search={{
                        enabled: false,
                    }}
                >
                    {children}
                </RootProvider>
            </body>
        </html>
    );
}
