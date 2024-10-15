import type { Metadata, ResolvingMetadata } from "next";
import BlogLayout from "./blog-layout";
import { ReactNode } from "react";
import { EDIT_BLOG } from "@ui-config/strings";

export async function generateMetadata(
    _: any,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    return {
        title: `${EDIT_BLOG} | ${(await parent)?.title?.absolute}`,
    };
}

export default function Layout({
    params,
    children,
}: {
    params: { id: string };
    children: ReactNode;
}) {
    const { id } = params;

    return <BlogLayout id={id}>{children}</BlogLayout>;
}
