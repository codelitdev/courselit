import { NEW_COMMUNITY_BUTTON } from "@ui-config/strings";
import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${NEW_COMMUNITY_BUTTON} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
