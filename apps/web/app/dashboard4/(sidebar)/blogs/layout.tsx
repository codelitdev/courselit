import { MANAGE_BLOG_PAGE_HEADING } from "@ui-config/strings";
import type { Metadata, ResolvingMetadata } from "next";
import { ReactNode } from "react";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${MANAGE_BLOG_PAGE_HEADING} | ${
            (await parent)?.title?.absolute
        }`,
    };
}

export default function Layout({ children }: { children: ReactNode }) {
    return children;
}
