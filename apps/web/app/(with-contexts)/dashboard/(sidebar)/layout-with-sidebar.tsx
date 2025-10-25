"use client";

import { AppSidebar } from "@components/admin/dashboard-skeleton/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ThemeContext } from "@components/contexts";
import { themes } from "@courselit/page-primitives";
import { Theme } from "@courselit/page-models";

export default function LayoutWithSidebar({
    children,
}: {
    children: React.ReactNode;
}) {
    const classicTheme = themes.find((theme) => theme.id === "classic");
    const theme: Theme = {
        id: "classic",
        name: "Classic",
        theme: classicTheme!.theme,
    };

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <ThemeContext.Provider value={{ theme, setTheme: () => {} }}>
                    {children}
                </ThemeContext.Provider>
            </SidebarInset>
        </SidebarProvider>
    );
}
