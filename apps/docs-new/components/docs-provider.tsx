"use client";

import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import SearchDialog from "@/components/search-dialog";

const searchEnabled = Boolean(
    process.env.NEXT_PUBLIC_ORAMA_PROJECT_ID &&
        process.env.NEXT_PUBLIC_ORAMA_API_KEY,
);

export function DocsProvider({ children }: { children: ReactNode }) {
    return (
        <RootProvider
            search={{
                enabled: searchEnabled,
                ...(searchEnabled ? { SearchDialog } : {}),
            }}
        >
            {children}
        </RootProvider>
    );
}
