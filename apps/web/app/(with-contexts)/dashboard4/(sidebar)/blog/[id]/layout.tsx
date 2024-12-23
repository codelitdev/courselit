import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";
import { EDIT_BLOG } from "@ui-config/strings";

export async function generateMetadata(
    { params }: { params: any },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${EDIT_BLOG} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
