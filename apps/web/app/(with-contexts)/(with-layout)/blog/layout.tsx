import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";
import { PAGE_HEADER_ALL_POSTS } from "@ui-config/strings";

export async function generateMetadata(
    { params }: { params: any },
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${PAGE_HEADER_ALL_POSTS} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
